const CompanyService = require("../services/company.service");
const MongoDB = require("../utils/mongodb.util");
const ApiError = require("../api-error");

// exports.updateCompany = async (req, res, next) => {
//   const id = req.params.id;
//   let avatarFileName, avatarLink, images;
//   const avatar = req.file;
//   const imageFiles = req.files;
//   if (Object.keys(req.body).length === 0) {
//     return next(new ApiError(400, "Data to update can not be empty"));
//   }
//   const description = JSON.parse(req.body.description);
//   req.body.description = description;
//   //Lấy thông tin ảnh đại diện
//   if (avatar) {
//     avatarFileName = avatar.filename;
//     avatarLink = `/avatars/${avatarFileName}`;
//   }
//   //Lấy thông tin ảnh của công ty
//   if (imageFiles) {
//     images = imageFiles.map((file) => `/images/${file.filename}`);
//   }
//   try {
//     const companyService = new CompanyService(MongoDB.client);
//     const updateCompany = await companyService.updateCompany(id, {
//       ...req.body,
//       avatarFileName,
//       avatarLink,
//       images,
//     });
//     if (!updateCompany) {
//       return next(new ApiError(404, "Company not found"));
//     } else {
//       return res.send({
//         message: "Update company successfully",
//         updateCompany,
//         avatarLink,
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     return next(new ApiError(500, "An error occured while updating company"));
//   }
// };
exports.updateCompany = async (req, res, next) => {
  //todo Lấy dữ liệu từ yêu cầu người dùng gồm id và body
  const id = req.params.id;
  const {
    companyName,
    companyEmail,
    companyPhone,
    companyAddress,
    description,
    website,
    images,
    contactInformation,
    policy,
  } = req.body;
  //todo Lấy file ảnh đại diện và ảnh công ty
  const avatar = req.files["avatar"] ? req.files["avatar"][0] : null; //? Lấy file avatar, bởi vì nó trả về một mảng nên truy xuất tới phần tử đầu tiên
  const companyImages = req.files["images"] || [];

  //todo Kiểm tra cập nhật hợp lệ
  if (Object.keys(req.body).length === 0) {
    return next(new ApiError(400, "Data to update can not be empty"));
  }
  //todo giải mã chuỗi JSON
  const sendingObject = {};
  if (companyName) {
    sendingObject["companyName"] = companyName;
  }
  if (companyEmail) {
    sendingObject["companyEmail"] = companyEmail;
  }
  if (companyPhone) {
    sendingObject["companyPhone"] = companyPhone;
  }
  if (companyAddress) {
    sendingObject["companyAddress"] = companyAddress;
  }
  if (website) {
    sendingObject["website"] = website;
  }
  if (description) {
    const descJson = JSON.parse(description);
    sendingObject["description"] = descJson;
  }
  if (images) {
    const imagesJson = JSON.parse(images);
    sendingObject["images"] = imagesJson;
    console.log(sendingObject["images"]);
  } else {
    sendingObject["images"] = [];
  }
  if (contactInformation) {
    const contactInformationJson = JSON.parse(contactInformation);
    sendingObject["contactInformation"] = contactInformationJson;
  }
  if (policy) {
    const policyJson = JSON.parse(policy);
    sendingObject["policy"] = policyJson;
  }
  //todo Định nghĩa các biến liên quan
  let avatarFileName, avatarLink;
  //todo Lấy thông tin ảnh đại diện
  if (avatar) {
    console.log(avatar.filename);
    avatarFileName = avatar.filename;
    avatarLink = `/avatars/${avatarFileName}`;
  }
  //Lấy thông tin ảnh của công ty
  if (companyImages) {
    img = companyImages.map((file) => `/images/${file.filename}`);
    sendingObject["images"] = sendingObject["images"].concat(img);
    console.log(sendingObject["images"]);
  }
  try {
    const companyService = new CompanyService(MongoDB.client);
    //Kiểm tra xem công ty có toàn tại không
    const company = await companyService.findById(id);
    if (!company) {
      return next(new ApiError(400, "Company not found"));
    }
    //todo Cập nhật thông tin công ty
    const updateCompany = await companyService.updateCompany(id, {
      ...sendingObject,
      avatarFileName,
      avatarLink,
    });
    if (!updateCompany) {
      return next(new ApiError(404, "Company not found"));
    } else {
      return res.send({
        message: "Update company successfully",
        updateCompany,
        avatarLink,
      });
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while updating company"));
  }
};

exports.getCompany = async (req, res, next) => {
  const id = req.params.id;
  try {
    const companyService = new CompanyService(MongoDB.client);
    const company = await companyService.findById(id);
    console.log(company);
    if (!company) {
      return next(new ApiError(404, "Company not found"));
    } else {
      return res.send(company);
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while getting company"));
  }
};

exports.updateImages = async (req, res, next) => {
  const id = req.params.id;
  const files = req.files;
  const { existingImages } = req.body; //todo Nhận một mảng dưới dạng chuỗi
  let images;
  let existingList = [];
  //todo cần phải chuyển đổi existingImages sang mảng nếu
  //todo không rỗng
  if (!files && !existingImages) {
    return next(new ApiError(400, "Data to update can not be empty"));
  }

  if (files) {
    images = files.map((file) => `/images/${file.filename}`);
  }

  if (existingImages) {
    existingList = JSON.parse(existingImages);
    images = existingList.concat(images);
  }

  try {
    const companyService = new CompanyService(MongoDB.client);
    const updatedData = await companyService.uploadCompanyImages(id, images);
    if (!updatedData) {
      return next(new ApiError(404, "Company not found"));
    }
    return res.send({ message: "Update images successfully", updatedData });
  } catch (error) {
    console.log(error);
    return next(new ApiError(500, "An error occured while updating images"));
  }
};
