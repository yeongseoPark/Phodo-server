// redisToMongo.js
const redis = require('redis');
const { MongoClient } = require('mongodb');
const Project = require('./models/project')

async function saveDataToMongoDB(activeProjects, mongoClient, redisClient) {

    // 열려있는 방 목록을 순회
    for (let project of activeProjects) {
        console.log("프로젝트아이디 : ", project)
        const redisData = await redisClient.get(project);
        let projectObj;
            try {
                projectObj = await Project.findById(project);
                if (!projectObj) {
                    activeProjects.delete(project);
                    redisClient.del(project, function(err, response) { // 존재하지 않는 프로젝트 id를 가진 레디스값 삭제
                        if (err) {
                          console.log(err);
                        }
                    })
                    continue;
                }
            } catch (error) {
                console.error('Error message:', error.message);
                console.error('Stack trace:', error.stack);
                activeProjects.delete(project);
                redisClient.del(project, function(err, response) { // 존재하지 않는 프로젝트 id를 가진 레디스값 삭제
                    if (err) {
                      console.log(err);
                    }
                })

                continue;
            }          
            const DataToObject = await JSON.parse(redisData);
  
            // MongoDB에 데이터 저장
            const db = await mongoClient.db('phodo');
            const nodeCollection = await db.collection('nodes');
            
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
    }



module.exports = { saveDataToMongoDB };
