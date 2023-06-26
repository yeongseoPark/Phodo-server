// redisToMongo.js
const redis = require('redis');
const { MongoClient } = require('mongodb');
const Project = require('./models/project')
  


function deleteAllKeys(callback, client) {
    const multi = client.multi();
  
    multi.keys('*', (err, keys) => {
      if (err) {
        console.error("Error getting keys:", err);
        return callback(err);
      }
  
      keys.forEach((key) => {
        multi.del(key);
      });
  
      multi.exec((err, replies) => {
        if (err) {
          console.error("Error deleting keys:", err);
          return callback(err);
        }
  
        console.log('All keys deleted');
        callback(null);
      });
    });
  }

async function saveDataToMongoDB(activeProjects, mongoClient, redisClient, clearRedis) {

    // 열려있는 방 목록을 순회
    for (let project of activeProjects) {
        const redisData = await redisClient.get(project);
        let projectObj;
            try {
                projectObj = await Project.findById(project);
            } catch (error) {
                console.error('Error message:', error.message);
                console.error('Stack trace:', error.stack);
                activeProjects.delete(project);
                redisClient.del(project, function(err, response) { // 존재하지 않는 프로젝트 id를 가진 레디스값 삭제
                    if (err) {
                      console.log(err);
                    }
                })

                return;
            
            }          
            const DataToObject = await JSON.parse(redisData);
  
            // MongoDB에 데이터 저장
            const db = await mongoClient.db('phodo');
  
            const nodeCollection = await db.collection('nodes');
            console.log(DataToObject['node'])
            let updateResult = await nodeCollection.updateOne(
                { projectId: project },  // Update based on the projectId
                { $set: { info: JSON.stringify(DataToObject['node']) } },
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
                { $set: { info: JSON.stringify(DataToObject['edge']) } },
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

        // clearRedis 플래그가 참일 경우에만 Redis DB를 클리어합니다.
        if (clearRedis) { 
            await deleteAllKeys((err) => {
                if (err) {
                  console.error("Error deleting keys:", err);
                }
              }, redisClient);
        }
    }



module.exports = { saveDataToMongoDB };
