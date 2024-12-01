const BehaviorTypes = require("../utils/enum");

class BehaviourService {
  constructor(client) {
    this.behaviours = client.db().collection("behaviours");
  }

  // static BehaviorTypes = {
  //   VIEW_JOB_POST: "view_job_post",
  //   SAVE_JOB_POST: "save_job_post",
  //   SEARCH_JOB_POST: "search_job_post",
  //   SEARCH_COMPANY: "search_company",
  //   VIEW_COMPANY: "view_company",
  //   FILTER_JOB_POST: "filter_job_post",
  // };

  //Hàm dùng để tạo template thông tin cho hành vi của người dùng
  extractGeneralBehavoursData(payload) {
    const data = {
      jobseekerId: payload.jobseekerId,
      actionType: payload.actionType,
      timestamp: payload.timestamp,
      metaData: this.extractMetaDataByBehaviorType(
        payload.actionType,
        payload.metaData
      ),
    };
    Object.keys(data).forEach(
      (key) => data[key] === undefined && delete data[key]
    );

    return data;
  }

  //Hàm dùng để tạo đối tượng metaData cho từng kiểu hành vi
  extractMetaDataByBehaviorType(type, data) {
    switch (type) {
      //1. Hành vi xem bài viết: view_job_post
      case BehaviorTypes.VIEW_JOB_POST: {
        const object = {
          jobpostingId: data.jobpostingId,
        };

        return object;
      }
      //2. Hành vi lưu bài viết: save_job_post
      case BehaviorTypes.SAVE_JOB_POST: {
        const object = {
          jobpostingId: data.jobpostingId,
        };

        return object;
      }
      //3. Hành vi tìm kiếm bài viết: search_job_post

      case BehaviorTypes.SEARCH_JOB_POST: {
        const object = {
          searchQuery: data.searchQuery,
        };

        return object;
      }
      //4. Hành vi tìm kiếm công ty: search_company

      case BehaviorTypes.SEARCH_COMPANY: {
        const object = {
          searchQuery: data.searchQuery,
        };

        return object;
      }
      //5. Hành vi xem công ty: view_company

      case BehaviorTypes.VIEW_COMPANY: {
        const object = {
          companyId: data.companyId,
        };

        return object;
      }
      //6. Hành vi lọc bài đăng: filter_job_post

      case BehaviorTypes.FILTER_JOB_POST: {
        const object = {
          filterOption: data.filterOption,
        };

        return object;
      }

      // Trường hợp không khớp với bất kỳ hành vi nào
      default: {
        console.warn(`Unrecognized actionType: ${type}`);
        object = {}; // hoặc có thể trả về thông báo lỗi tùy theo yêu cầu.
        break;
      }
    }
  }

  //Hàm quan sát hành động view_job_post
  async observeBehaviors(data) {
    const behaviours = this.extractGeneralBehavoursData(data);
    const result = await this.behaviours.insertOne(behaviours);
    return result.insertId;
  }
}

module.exports = BehaviourService;
