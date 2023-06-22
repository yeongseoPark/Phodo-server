// redisToMongo.js
const redis = require('redis');
const { MongoClient } = require('mongodb');
const Project = require('./models/project')

// Redis 클라이언트 생성
// const redisClient = redis.createClient({
//   host: 'localhost',
//   port: 6379,
// });

// MongoDB 연결 정보
const mongoURI = 'mongodb://localhost:27017';

// MongoDB 클라이언트 생성 및 연결
const mongoClient = new MongoClient(mongoURI);

async function saveDataToMongoDB(activeProjects, redisClient) {
    // 열려있는 방 목록을 순회
    for (let project of activeProjects) {

    redisClient.get(project, async (err, redisData) => {
        if (err) {
            console.error('Error while fetching data from Redis:', err);
            return;
        }
    
        try {
            console.log(redisData);
      
            const projectObj = await Project.findById(project);
            const DataToObject = JSON.parse(redisData);
      
            // MongoDB에 데이터 저장
            await mongoClient.connect();
            const db = mongoClient.db(dbName);
      
            const nodeCollection = db.collection(nodesCollectionName);
            let updateResult = await nodeCollection.updateOne(
              { projectId: project },
              { $set: DataToObject['node'] },
              { upsert: true }
            );
      
            // 새로 삽입된 경우, upsertedId를 사용
            // 아닌 경우, 일치하는 문서를 찾아서 그 _id를 사용
            let id;
            if (updateResult.upsertedId) {
              id = updateResult.upsertedId;
            } else {
              const doc = await nodeCollection.findOne({ projectId: project });
              id = doc._id;
            }
            projectObj.nodeId = id;
      
            const edgeCollection = db.collection(edgesCollectionName);
            updateResult = await edgeCollection.updateOne(
              { projectId: project },
              { $set: DataToObject['edge'] },
              { upsert: true }
            );
      
            if (updateResult.upsertedId) {
              id = updateResult.upsertedId;
            } else {
              const doc = await edgeCollection.findOne({ projectId: project });
              id = doc._id;
            }
            projectObj.edgeId = id;
      
            await projectObj.save();
      
            console.log('Data saved to MongoDB successfully.');
          } catch (error) {
            console.error('Error while saving data to MongoDB:', error);
          } finally {
            // 연결 해제
            mongoClient.close();
          }
        })
    }
  }
  

module.exports = { saveDataToMongoDB };
