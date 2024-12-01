const provinceLocations = [
  { name: "An Giang", latitude: 10.52, longitude: 105.1259 },
  { name: "Bà Rịa - Vũng Tàu", latitude: 10.5417, longitude: 107.2428 },
  { name: "Bắc Giang", latitude: 21.2872, longitude: 106.1946 },
  { name: "Bắc Kạn", latitude: 22.149, longitude: 105.8348 },
  { name: "Bạc Liêu", latitude: 9.2941, longitude: 105.7215 },
  { name: "Bắc Ninh", latitude: 21.1861, longitude: 106.0763 },
  { name: "Bến Tre", latitude: 10.242, longitude: 106.375 },
  { name: "Bình Định", latitude: 13.782, longitude: 109.219 },
  { name: "Bình Dương", latitude: 11.2126, longitude: 106.6098 },
  { name: "Bình Phước", latitude: 11.7512, longitude: 106.7289 },
  { name: "Bình Thuận", latitude: 11.0905, longitude: 108.0721 },
  { name: "Cà Mau", latitude: 9.1769, longitude: 105.1524 },
  { name: "Cần Thơ", latitude: 10.0452, longitude: 105.7469 },
  { name: "Cao Bằng", latitude: 22.6663, longitude: 106.265 },
  { name: "Đà Nẵng", latitude: 16.0544, longitude: 108.2022 },
  { name: "Đắk Lắk", latitude: 12.71, longitude: 108.2378 },
  { name: "Đắk Nông", latitude: 12.2646, longitude: 107.6098 },
  { name: "Điện Biên", latitude: 21.386, longitude: 103.0207 },
  { name: "Đồng Nai", latitude: 11.0817, longitude: 107.4434 },
  { name: "Đồng Tháp", latitude: 10.5355, longitude: 105.6844 },
  { name: "Gia Lai", latitude: 13.9918, longitude: 108.1324 },
  { name: "Hà Giang", latitude: 22.8202, longitude: 104.9784 },
  { name: "Hà Nam", latitude: 20.5835, longitude: 105.922 },
  { name: "Hà Nội", latitude: 21.0285, longitude: 105.8542 },
  { name: "Hà Tĩnh", latitude: 18.3554, longitude: 105.8877 },
  { name: "Hải Dương", latitude: 20.9389, longitude: 106.316 },
  { name: "Hải Phòng", latitude: 20.8449, longitude: 106.6881 },
  { name: "Hậu Giang", latitude: 9.7842, longitude: 105.4701 },
  { name: "Hòa Bình", latitude: 20.8581, longitude: 105.3376 },
  { name: "Hưng Yên", latitude: 20.646, longitude: 106.051 },
  { name: "Khánh Hòa", latitude: 12.2585, longitude: 109.0526 },
  { name: "Kiên Giang", latitude: 10.0125, longitude: 105.0809 },
  { name: "Kon Tum", latitude: 14.3498, longitude: 107.9936 },
  { name: "Lai Châu", latitude: 22.3965, longitude: 103.4586 },
  { name: "Lâm Đồng", latitude: 11.9416, longitude: 108.4419 },
  { name: "Lạng Sơn", latitude: 21.847, longitude: 106.7583 },
  { name: "Lào Cai", latitude: 22.486, longitude: 103.9707 },
  { name: "Long An", latitude: 10.6956, longitude: 106.2471 },
  { name: "Nam Định", latitude: 20.4174, longitude: 106.1681 },
  { name: "Nghệ An", latitude: 18.67, longitude: 105.6813 },
  { name: "Ninh Bình", latitude: 20.2584, longitude: 105.9793 },
  { name: "Ninh Thuận", latitude: 11.6739, longitude: 108.851 },
  { name: "Phú Thọ", latitude: 21.3197, longitude: 105.1983 },
  { name: "Phú Yên", latitude: 13.0882, longitude: 109.0929 },
  { name: "Quảng Bình", latitude: 17.4837, longitude: 106.6006 },
  { name: "Quảng Nam", latitude: 15.573, longitude: 108.4726 },
  { name: "Quảng Ngãi", latitude: 15.1205, longitude: 108.8049 },
  { name: "Quảng Ninh", latitude: 20.959, longitude: 107.0449 },
  { name: "Quảng Trị", latitude: 16.75, longitude: 107.1854 },
  { name: "Sóc Trăng", latitude: 9.6035, longitude: 105.9802 },
  { name: "Sơn La", latitude: 21.3273, longitude: 103.9003 },
  { name: "Tây Ninh", latitude: 11.3545, longitude: 106.1476 },
  { name: "Thái Bình", latitude: 20.4477, longitude: 106.3362 },
  { name: "Thái Nguyên", latitude: 21.5861, longitude: 105.8481 },
  { name: "Thanh Hóa", latitude: 19.8066, longitude: 105.7772 },
  { name: "Thừa Thiên Huế", latitude: 16.4637, longitude: 107.5905 },
  { name: "Tiền Giang", latitude: 10.4493, longitude: 106.3439 },
  { name: "TP Hồ Chí Minh", latitude: 10.8231, longitude: 106.6297 },
  { name: "Trà Vinh", latitude: 9.9347, longitude: 106.3455 },
  { name: "Tuyên Quang", latitude: 21.8285, longitude: 105.2134 },
  { name: "Vĩnh Long", latitude: 10.2529, longitude: 105.972 },
  { name: "Vĩnh Phúc", latitude: 21.3083, longitude: 105.6046 },
  { name: "Yên Bái", latitude: 21.705, longitude: 104.8974 },
];
//Hàm dùng để loại bỏ dấu của văn bản tiếng Việt
function normalizeString(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

//Hàm tìm kiếm một tỉnh/thành phố và trả về tọa độ của chúng
function searchProvince(province) {
  const normalizedProvince = normalizeString(province).toLowerCase();
  return provinceLocations.find(
    (location) =>
      normalizeString(location.name).toLowerCase() === normalizedProvince
  );
}

//Hàm dùng để tính khoảng cách giữa hai điểm trên trái đất bao gồm vĩ độ và kinh độ
function haversine(province1, province2) {
  //Vĩ độ và kinh độ của  tỉnh/thành phố 1
  let lat1 = province1.latitude;
  const lon1 = province1.longitude;
  //Vĩ độ và kinh độ của tỉnh/thành phố 2
  let lat2 = province2.latitude;
  const lon2 = province2.longitude;

  //Tính khoảng cách giữa vĩ độ và kinh độ giữa hai điểm
  let dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  let dLon = ((lon2 - lon1) * Math.PI) / 180.0;

  //Chuyển đổi sang radian
  lat1 = (lat1 * Math.PI) / 180.0;
  lat2 = (lat2 * Math.PI) / 180.0;

  //Áp dụng công thức haversine
  let a =
    Math.pow(Math.sin(dLat / 2), 2) +
    Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);

  let rad = 6371; //Bán kính Trái đất
  let c = 2 * Math.asin(Math.sqrt(a));

  return rad * c;
}

function findNearestProvince(targetProvince, provinces, top = 5) {
  //Tính khoảng cách từ tỉnh provinece đến các tỉnh khác
  const distances = provinces
    .filter((province) => province.name != targetProvince.name)
    .map((province) => ({
      name: province.name,
      distance: haversine(targetProvince, province),
    }));

  //Sắp xếp khoảng cách theo thứ tự tăng dần
  distances.sort((a, b) => a.distance - b.distance);
  //Trả về danh sách 5 tỉnh/thành phố gần nhất
  return distances.slice(0, top);
}

module.exports = { haversine, searchProvince, findNearestProvince };
