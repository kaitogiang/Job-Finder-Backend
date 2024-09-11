const JobpostingService = require("../services/jobposting.service");
const MongoDB = require("../utils/mongodb.util");

let jobpostingCollection;

const jobpostingHandler = (io) => {
  const db = MongoDB.client.db();
  jobpostingCollection = db.collection("jobpostings");

  const jobpostingChangeStream = jobpostingCollection.watch([], {
    fullDocument: "updateLookup",
  });

  jobpostingChangeStream.on("change", async (change) => {
    console.log(change);
    const operationType = change.operationType;
    const jobpostingService = new JobpostingService(MongoDB.client);
    let jobposting = null;
    // const document = change.fullDocument;
    const id = change.documentKey._id.toString();

    if (operationType != "delete") {
      jobposting = await jobpostingService.findById(id);
    } else {
      jobposting = id;
    }
    const updateJobposting = {
      operationType: operationType,
      modifiedJobposting: jobposting,
    };
    io.emit("jobposting:modified", updateJobposting);
  });
};

module.exports = { jobpostingHandler };
