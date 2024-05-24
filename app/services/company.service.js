const { ObjectId } = require("mongodb");

class CompanyService {
    constructor() {
        this.companies = client.db().collection('companies');
    }
    //Hàm trích xuất dữ liệu của Company
    extractCompanyData(payload) {
        const avatarId = new ObjectId('66509252fdf21b71669818c6');
        const company = {
            name: payload.companyName,
            email: payload.companyEmail,
            description: payload.description,
            phone: payload.phone,
            address: payload.address,
            website: payload.website,
            avatarId: payload.avatarId || avatarId
        };

        Object.keys(company).forEach(
            (key) => company[key] === undefined && delete company[key]
        );

        return company;
    }

    async createCompany(payload) {
        const company = this.extractCompanyData(payload);
        const now = new Date();
        return await this.companies.insertOne({
            ...company,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        });
    }
}