"""
- 단어간의 관계도 그림
https://storage.googleapis.com/openimages/2018_04/bbox_labels_600_hierarchy_visualizer/circle.html

- csv와 json 파일 출처
https://storage.googleapis.com/openimages/web/factsfigures_v7.html#class-definitions
"""

import csv, json

# google cloud vision에서 사용하는 라벨들의 모음
filename = "./descriptions.csv" # 식별번호, 라벨 로 기록된 CSV

dic = {} # 식별번호 : 라벨 -> 딕셔너리
rdic = {} # 라벨 : 식별번호

with open(filename, 'r') as data:
    for i in data:
        tmp = i.split(',')
        dic[tmp[0]] = tmp[1][:-1].lower()
        rdic[tmp[1][:-1].lower()] = tmp[0]

target_dic = {}

# 타겟(하위 레이블들이 소속되는 분류 레이블)로 하고자하는 레이블들
target_category = [
"tool",
"animal",
"clothing",
"vehicle",
"food",
"person",
"tool",
"building",
"sports equipment",
"furniture",
"kitchenware",
"office supplies",
"plant",
"traffic sign"
]

# 타겟 딕셔너리에 타겟들을 넣어줌
for i in target_category:
    target_dic[i] = i

# GCV가 뱉는 label들의 계층관계가 기록된 JSON, 딕셔너리로 변환
with open ("./labels_hierarchy.json" ,'r') as data:
    json_dic = json.load(data)

# 최상위 레이블인 entity는 빼줌
json_dic = json_dic["Subcategory"]

# 딕셔너리에서 LabelName과 Subcategory를 빼고, 레이블들만의 계층관계를 표현하게 변경
def process_json(json_data):
    result = {}
    
    for item in json_data:
        label_name = item['LabelName']
        subcategory = item.get('Subcategory', [])
        
        if subcategory:
            result[dic[label_name]] = process_json(subcategory)
        else:
            result[dic[label_name]] = None
        
    return result

json_dic = process_json(json_dic)

# 온갖 레이블 : 우리가 원하는 타겟 형식으로 저장될 딕셔너리
final_dic = {} 

# 타겟 딕셔너리를 찾았으니, 이제 final_dic에서 하위 레이블들은 자신의 상위에 해당하는 타겟 레이블을 value로 가짐
def into_dic(middle_dic, target):
    for key, value in middle_dic.items():
        final_dic[key] = target
        if value:
            into_dic(value, target)

# json_dic을 순회하며 final_dic을 기록하기 위한 함수
def traverse_dic(json_dic):
    for key, value in json_dic.items():
        if key in target_dic:
            if value:
                into_dic(value, key)
            else:
                final_dic[key] = key

        elif value:
            traverse_dic(value)

traverse_dic(json_dic)
print(final_dic)

# 자바스크립트 object로 변경하기 위해 일단 json으로 변경 후 저장
final_dic_json = json.dumps(final_dic)
with open('output.json', 'w') as file:
    file.write(final_dic_json)