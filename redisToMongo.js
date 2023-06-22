// redisToMongo.js
const redis = require('redis');
const { MongoClient } = require('mongodb');
const Project = require('./models/project')

// // Redis 클라이언트 생성
// const redisClient = redis.createClient({
//   host: 'localhost',
//   port: 6379,
// });

// MongoDB 연결 정보
// const mongoURI = 'mongodb://localhost:27017';

// MongoDB 클라이언트 생성 및 연결
// const mongoClient = new MongoClient(mongoURI);

async function saveDataToMongoDB(activeProjects, mongoClient, redisClient) {

    // 열려있는 방 목록을 순회
    for (let project of activeProjects) {
        console.log(project)
        const redisData = await redisClient.get(project);
            const projectObj = await new Project(Project.findById(project));
            const DataToObject = await JSON.parse(redisData);
  
            // MongoDB에 데이터 저장
            await mongoClient.connect();
            const db = await mongoClient.db('phodo');
  
            const nodeCollection = await db.collection('nodes');
            console.log(DataToObject['node'])
            let updateResult = await nodeCollection.updateOne(
                { projectId: project },  // Update based on the projectId
                { $set: { info: DataToObject['node'] } },
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
  
            const edgeCollection = await db.collection('edges');
            updateResult = await edgeCollection.updateOne(
                { projectId: project },  // Update based on the projectId
                { $set: { info: DataToObject['edge'] } },
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
        }
    }



module.exports = { saveDataToMongoDB };
