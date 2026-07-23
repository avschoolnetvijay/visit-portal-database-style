using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolVisitPortal.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string PasswordHash { get; set; }
        public string Role { get; set; }
        public string FullName { get; set; }
        public string Designation { get; set; }
        public string AssignedDistrict { get; set; }
        public string Permissions { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class School
    {
        public int Id { get; set; }
        public string UdiseCode { get; set; }
        public string SchoolName { get; set; }
        public string Zone { get; set; }
        public string District { get; set; }
        public string Block { get; set; }
        public string ProjectName { get; set; }
        public string VisitorName { get; set; }
        public string Latitude { get; set; }
        public string Longitude { get; set; }
        public string PlusCode { get; set; }
        public string Cluster { get; set; }
        public int MonthlyTarget { get; set; } = 1;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Visit
    {
        public int Id { get; set; }
        public string UdiseCode { get; set; }
        public string VisitDate { get; set; }
        public string VisitorName { get; set; }
        public string Remarks { get; set; }
        public string GpsIn { get; set; }
        public string GpsOut { get; set; }
        public decimal? Distance { get; set; }
        public string GeocodedAddressIn { get; set; }
        public string GeocodedAddressOut { get; set; }
        public string VisitType { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class JhpmsLab
    {
        public int Id { get; set; }
        public string Udise { get; set; }
        public string Date { get; set; }
        public string LabType { get; set; }
        public string Subject { get; set; }
        public string SubjectTeacher { get; set; }
        public string InTime { get; set; }
        public string OutTime { get; set; }
        public string TotalHour { get; set; }
        public string TheoryPractical { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Edustat
    {
        public int Id { get; set; }
        public string Udise { get; set; }
        public string Serial { get; set; }
        public string Date { get; set; }
        public decimal? Hours { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class EdustatMaster
    {
        public int Id { get; set; }
        public string Udise { get; set; }
        public string Device { get; set; }
        public string Serial { get; set; }
        public string Installed { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Manpower
    {
        public int Id { get; set; }
        public string Udise { get; set; }
        public string Status { get; set; }
        public string InstructorName { get; set; }
        public string JoiningDate { get; set; }
        public string StatusDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Visit360
    {
        public int Id { get; set; }
        public string VisitDate { get; set; }
        public string VisitType { get; set; }
        public string StaffName { get; set; }
        public string Designation { get; set; }
        public string UdiseCode { get; set; }
        public string PlaceName { get; set; }
        public string State { get; set; }
        public string District { get; set; }
        public string Block { get; set; }
        public string InTime { get; set; }
        public string OutTime { get; set; }
        public decimal? Duration { get; set; }
        public string Remarks { get; set; }
        public string InAddress { get; set; }
        public string OutAddress { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Metadata
    {
        [Key]
        public string Key { get; set; }
        public string Value { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
