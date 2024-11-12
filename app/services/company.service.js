const { ObjectId, ReturnDocument } = require("mongodb");

class CompanyService {
  constructor(client) {
    this.companies = client.db().collection("companies");
    this.avatars = client.db().collection("avatars");
  }
  //Hàm trích xuất dữ liệu của Company
  extractCompanyData(payload) {
    const company = {
      companyName: payload.companyName,
      companyEmail: payload.companyEmail,
      description: payload.description,
      companyPhone: payload.companyPhone,
      companyAddress: payload.companyAddress,
      website: payload.website,
      avatarId: payload.avatarId,
      images: payload.images,
      contactInformation: payload.contactInformation,
      policy: payload.policy,
    };

    Object.keys(company).forEach(
      (key) => company[key] === undefined && delete company[key]
    );

    return company;
  }

  async updateCompany(id, payload) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    console.log("Trong service");
    console.log(this.extractCompanyData(payload));
    //Kiểm tra xem có xem ảnh đại diện đã được up lên chưa
    let avatarId;
    if (payload.avatarFileName && payload.avatarLink) {
      const avatarDoc = {
        avatarName: payload.avatarFileName,
        avatarLink: payload.avatarLink,
      };
      const avatar = await this.avatars.insertOne(avatarDoc);
      avatarId = avatar.insertedId;
    }
    const updatedCompany = this.extractCompanyData({
      ...payload,
      avatarId,
    });
    //?Thực hiện cập nhật company
    await this.companies.findOneAndUpdate(
      filter,
      { $set: updatedCompany },
      { returnDocument: ReturnDocument.AFTER }
    );

    //?Join với avatars để lấy link ảnh và thả vào trong updatedCompany
    const result = await this.companies
      .aggregate([
        {
          $match: filter,
        },
        {
          $lookup: {
            from: "avatars",
            localField: "avatarId",
            foreignField: "_id",
            as: "avatar",
          },
        },
        {
          $unwind: "$avatar",
        },
        {
          $addFields: {
            avatar: "$avatar.avatarLink",
          },
        },
      ])
      .toArray();

    return result[0];
  }

  async findById(id) {
    const result = await this.companies
      .aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(id),
          },
        },
        {
          $lookup: {
            from: "avatars",
            localField: "avatarId",
            foreignField: "_id",
            as: "avatar",
          },
        },
        {
          $unwind: "$avatar",
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            companyEmail: 1,
            companyPhone: 1,
            companyAddress: 1,
            website: 1,
            description: 1,
            images: 1,
            contactInformation: 1,
            policy: 1,
            avatar: "$avatar.avatarLink",
          },
        },
      ])
      .toArray();
    return result.length > 0 ? result[0] : null;
  }

  async uploadCompanyImages(id, images) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const result = await this.companies.findOneAndUpdate(
      filter,
      { $set: { images } },
      { returnDocument: ReturnDocument.AFTER }
    );

    return result;
  }

  async deleteImage(id, indexList) {
    const filter = {
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    };
    const unsetObject = {};
    indexList.forEach((index) => {
      unsetObject[`images.${index}`] = 1;
    });
    await this.companies.updateOne(filter, { $unset: unsetObject });

    await this.companies.findOneAndUpdate(filter, { $pull: { images: null } });
    const result = await this.companies.findOneAndUpdate(
      filter,
      { $pull: { images: null } },
      { returnDocument: ReturnDocument.AFTER }
    );
    return result["images"];
  }

  async getAll() {
    const result = await this.companies
      .aggregate([
        {
          $lookup: {
            from: "avatars",
            localField: "avatarId",
            foreignField: "_id",
            as: "avatar",
          },
        },
        {
          $unwind: "$avatar",
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            companyEmail: 1,
            companyPhone: 1,
            companyAddress: 1,
            website: 1,
            description: 1,
            images: 1,
            contactInformation: 1,
            policy: 1,
            avatar: "$avatar.avatarLink",
          },
        },
      ])
      .toArray();
    return result.length > 0 ? result : null;
  }

  async getEmployerIdByCompanyId(id) {
    const result = await this.companies
      .aggregate([
        {
          $match: {
            _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
          },
        },
        {
          $lookup: {
            from: "employers",
            localField: "_id",
            foreignField: "companyId",
            as: "employer",
          },
        },
        {
          $unwind: "$employer",
        },
        {
          $project: {
            employerId: { $toString: "$employer._id" },
          },
        },
      ])
      .toArray();
    return result.length > 0 ? result[0] : null;
  }

  async getCompanyNameByCompanyId(id) {
    const result = await this.companies.findOne({
      _id: ObjectId.isValid(id) ? ObjectId.createFromHexString(id) : null,
    });
    return result ? result.companyName : null;
  }
}

module.exports = CompanyService;
