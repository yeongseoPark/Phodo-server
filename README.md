# Phodo

<img width="650" alt="포ㅗㅗ도" src="https://github.com/yeongseoPark/Phodo-server/assets/79896709/3eab7d72-9594-4b03-88db-73b88d0023cd">

### 이미지 공유 협업 툴 Phodo

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [서비스 소개](#서비스-소개)
3. [Backend는 이런 일을 했습니다!](#backend는-이런-일을-했습니다)
4. [서비스 구조도](#서비스-구조도)
5. [프로젝트 포스터](#프로젝트-포스터)

## 프로젝트 개요 
프로젝트 기간 : 2023.06.01 ~ 2023.07.08
기술 스택: 
| 분류                      | 기술                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**              | <img src="https://img.shields.io/badge/react-61DAFB?style=for-the-badge&logo=react&logoColor=black"> <img src="https://img.shields.io/badge/react--query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white"> <img src="https://img.shields.io/badge/zustand-EC6550?style=for-the-badge&logo=zustand&logoColor=white"> <img src="https://img.shields.io/badge/tailwindcss-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white"> |
| **Backend**               | 	<img src="https://img.shields.io/badge/express-000000?style=for-the-badge&logo=express&logoColor=white">                                                                                                                                                                                                 |
| **Database**              | 	<img src="https://img.shields.io/badge/mongodb-47A248?style=for-the-badge&logo=mongodb&logoColor=white"> <img src="https://img.shields.io/badge/redis-DC382D?style=for-the-badge&logo=redis&logoColor=white">                                                                                                                 |
| **Infrastructure/DevOps** | 	<img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white"> <img src="https://img.shields.io/badge/aws_ec2-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white">           |


팀원 : [박영서(BE)](https://github.com/yeongseoPark), [김현태(BE)](https://github.com/HyeonTee), [정진교(FE)](https://github.com/JinkyoJB), [이호준(FE)](https://github.com/hodeethelion), [권도희(FE/BE)](https://github.com/shiwy15)

웹사이트 : [바로가기](https://www.phodo.store)

발표 영상 : [바로가기](https://www.youtube.com/watch?v=EIHqqGvtivI)

## 서비스 소개
### Phodo에서는 이런 기능을 사용할 수 있습니다
1. 유저가 업로드한 사진을 분석하여 자동 태깅 및, 자동 카테고리 분류
<img src="https://github.com/yeongseoPark/Phodo-server/assets/118068099/f7f91d46-a73b-4652-bf40-0a5448783b83">

2. 그룹으로 실시간 동시작업과 음성통화를 통한 업무 공유
<img src="https://github.com/yeongseoPark/Phodo-server/assets/118068099/2a52c0eb-7116-45e2-a177-eeb70dbccb2b">

3. 회의 내용에 따른 자동 AI보고서 작성
<img src="https://github.com/yeongseoPark/Phodo-server/assets/118068099/7b5c9de7-c308-4983-b6f5-ce10b9674aee">

## Backend는 이런 일을 했습니다!
### 1. 업로드 시 Google Cloud vision과 Google natural language api를 통한 태깅 및 카테고리 분류
- 이미지 카테고리 관리 및 검색을 위해 유저가 사진 업로드 시 아래와 같은 단계를 거칩니다.
- 대용량 이미지 관리를 위해 원본은 cloude storage에 올린 뒤 DB에는 url만 저장했으며, 썸네일을 이용해 데이터 볼륨을 감소하고 렌더링 속도를 개선함
- vision API를 이용해 이미지 라벨들을 추출 -> 라벨 관계도를 이용한 DFS 알고리즘으로 라벨 1차 분류 -> 라벨들의 자연어 처리(natural language API)를 통해 2차 분류
  - 1차로 분류한 라벨들의 범위가 너무 넓어서, 자연어 처리를 이용해 라벨들의 관계도를 한 번 더 파악하여 카테고리를 분류함.
- 이미지 검색 및 관리를 위해 촬영 시간을 추출하고, Kakao Map API를 이용해 위치(위도,경도)를 행정구역으로 변환하여 검색의 편의성을 높임
### 2. 실시간 작업 데이터 처리에 적합한 구조 설계 
<img width="595" alt="image" src="https://github.com/yeongseoPark/Phodo-server/assets/79896709/8f68464d-9e4c-423c-93bf-dc3af62fbce0">

- 공유 작업 데이터에 대한 데이터를 Yjs에서 웹소켓을 이용하여 실시간으로 메인서버로 전송
- 이를 받은 백엔드는, Redis에 데이터를 먼저 저장한 후, DB에 주기적으로 값을 저장하는 Write-back 방식을 사용
- 이를 통해 잦은 디스크 접근에 대한 비용 절감

### 3. 웹소켓 Signalling Server구현
- 실시간 편집 창에 접속한 브라우저들의 P2P WebRTC 통신 성립을 위한 signalling server 구현
- 이때, mesh 방식을 사용했기 때문에, 각 peer(브라우저)는 자신이 접속하려는 방의 모든 유저들에 P2P연결을 수립해야 함
- 이를 위해 각 방을 roomObjArr이라는 구조체로 관리
- offer -> answer -> ice 의 WebRTC 성립 단계에 맞는 웹소켓 이벤트를 listen하고, 이에 적합한 이벤트를 emit.

### 4. ChagGPT 프롬프팅을 통한 자동 보고서 생성
- ChatGPT text-davinci-003 모델과 API연결
- 원하는 대답에 알맞는 프롬프트 작성하여 응답 수령

### 5. 로그인 및 project, image CRUD

## 서비스 구조도
<img width="800" alt="아키텍쳐" src="https://github.com/yeongseoPark/Phodo-server/assets/79896709/a753895a-5d42-4a0c-a7cb-11a4bb38e164">


## 프로젝트 포스터
![3](https://github.com/yeongseoPark/Phodo-server/assets/79896709/fef9cb60-4642-4ffb-8992-15f2fd6b5b94)
