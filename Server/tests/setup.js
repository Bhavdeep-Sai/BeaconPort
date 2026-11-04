const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_super_secret_jwt_key_min_32_characters";
process.env.GOOGLE_CLIENT_ID = "mock-google-client-id.apps.googleusercontent.com";
process.env.GEMINI_API_KEY = "mock-gemini-api-key";

jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Ensure all compound unique indexes are built for tests
  const Student = require("../models/studentModel");
  const Teacher = require("../models/teacherModel");
  const Salary = require("../models/salaryModel");
  const Attendance = require("../models/attendanceModel");
  const Fee = require("../models/feeModel");
  const Class = require("../models/classModel");
  const Subject = require("../models/subjectModel");

  await Promise.all([
    Student.syncIndexes(),
    Teacher.syncIndexes(),
    Salary.syncIndexes(),
    Attendance.syncIndexes(),
    Fee.syncIndexes(),
    Class.syncIndexes(),
    Subject.syncIndexes(),
  ]);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

