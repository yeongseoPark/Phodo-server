// google vision 패키지를 변수에 담음
var vision = require('google-vision-api-client');
var requtil = vision.requtil;

var jsonfile = 'hyeontest-388510-6a65bba5d8ca.json';
vision.init(jsonfile);
// 감지할 라벨 목록 지정
const labels = [
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "backpack",
    "umbrella",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "couch",
    "potted plant",
    "bed",
    "dining table",
    "toilet",
    "tv",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush"
];
//Build the request payloads

var d = requtil.createRequests().addRequest(
  requtil.createRequest('268baa3949c2d1c8f65d0a9c29da0ab1.jpg')
  .withFeature('LABEL_DETECTION', 10)
  .build());
    
  //Do query to the api server
  vision.query(d, function(e, r, d){
  if(e) console.log('ERROR:', e);
  for(var i = 0; i < d.responses.length; i++) {
    var response = d.responses[i];

    // Go through each label annotation in the response
    for(var j = 0; j < response.labelAnnotations.length; j++) {
      var label = response.labelAnnotations[j];

      // Print out the description
	  if (labels.includes(label.description)) {
        console.log(label.description, label.score);
	  }
    }
  } 
  });

  // console.log(JSON.stringify(d));