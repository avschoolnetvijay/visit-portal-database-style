-- 1. Create Users Table
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(256) NOT NULL,
    Role NVARCHAR(MAX) NULL,
    FullName NVARCHAR(200) NULL,
    Designation NVARCHAR(200) NULL,
    AssignedDistrict NVARCHAR(100) NULL,
    Permissions NVARCHAR(MAX) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 2. Create Schools Table
CREATE TABLE Schools (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UdiseCode NVARCHAR(100) UNIQUE NOT NULL,
    SchoolName NVARCHAR(255) NULL,
    Zone NVARCHAR(100) NULL,
    District NVARCHAR(100) NULL,
    Block NVARCHAR(100) NULL,
    ProjectName NVARCHAR(255) NULL,
    VisitorName NVARCHAR(255) NULL,
    Latitude NVARCHAR(50) NULL,
    Longitude NVARCHAR(50) NULL,
    PlusCode NVARCHAR(100) NULL,
    Cluster NVARCHAR(100) NULL,
    MonthlyTarget INT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 3. Create Visits Table
CREATE TABLE Visits (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UdiseCode NVARCHAR(100) NOT NULL,
    VisitDate NVARCHAR(100) NULL,
    VisitorName NVARCHAR(255) NULL,
    Remarks NVARCHAR(MAX) NULL,
    GpsIn NVARCHAR(100) NULL,
    GpsOut NVARCHAR(100) NULL,
    Distance DECIMAL(18,4) NULL,
    GeocodedAddressIn NVARCHAR(MAX) NULL,
    GeocodedAddressOut NVARCHAR(MAX) NULL,
    VisitType NVARCHAR(100) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 4. Create JhpmsLab Table
CREATE TABLE JhpmsLab (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Udise NVARCHAR(100) NOT NULL,
    Date NVARCHAR(100) NULL,
    LabType NVARCHAR(100) NULL,
    Subject NVARCHAR(255) NULL,
    SubjectTeacher NVARCHAR(255) NULL,
    InTime NVARCHAR(50) NULL,
    OutTime NVARCHAR(50) NULL,
    TotalHour NVARCHAR(50) NULL,
    TheoryPractical NVARCHAR(100) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 5. Create Edustat Table
CREATE TABLE Edustat (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Udise NVARCHAR(100) NOT NULL,
    Serial NVARCHAR(255) NULL,
    Date NVARCHAR(100) NULL,
    Hours DECIMAL(18,4) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 6. Create EdustatMaster Table
CREATE TABLE EdustatMaster (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Udise NVARCHAR(100) NOT NULL,
    Device NVARCHAR(255) NULL,
    Serial NVARCHAR(255) NULL,
    Installed NVARCHAR(100) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 7. Create Manpower Table
CREATE TABLE Manpower (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Udise NVARCHAR(100) NOT NULL,
    Status NVARCHAR(100) NULL,
    InstructorName NVARCHAR(255) NULL,
    JoiningDate NVARCHAR(100) NULL,
    StatusDate NVARCHAR(100) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 8. Create Visit360 Table
CREATE TABLE Visit360 (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VisitDate NVARCHAR(100) NULL,
    VisitType NVARCHAR(100) NULL,
    StaffName NVARCHAR(255) NULL,
    Designation NVARCHAR(255) NULL,
    UdiseCode NVARCHAR(100) NULL,
    PlaceName NVARCHAR(255) NULL,
    State NVARCHAR(100) NULL,
    District NVARCHAR(100) NULL,
    Block NVARCHAR(100) NULL,
    InTime NVARCHAR(50) NULL,
    OutTime NVARCHAR(50) NULL,
    Duration DECIMAL(18,4) NULL,
    Remarks NVARCHAR(MAX) NULL,
    InAddress NVARCHAR(MAX) NULL,
    OutAddress NVARCHAR(MAX) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 9. Create Metadata Table
CREATE TABLE Metadata (
    [Key] NVARCHAR(150) PRIMARY KEY,
    Value NVARCHAR(MAX) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);
