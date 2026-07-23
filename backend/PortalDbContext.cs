using Microsoft.EntityFrameworkCore;
using SchoolVisitPortal.Models;

namespace SchoolVisitPortal.Data
{
    public class PortalDbContext : DbContext
    {
        public PortalDbContext(DbContextOptions<PortalDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<School> Schools { get; set; }
        public DbSet<Visit> Visits { get; set; }
        public DbSet<JhpmsLab> JhpmsLab { get; set; }
        public DbSet<Edustat> Edustat { get; set; }
        public DbSet<EdustatMaster> EdustatMaster { get; set; }
        public DbSet<Manpower> Manpower { get; set; }
        public DbSet<Visit360> Visit360 { get; set; }
        public DbSet<Metadata> Metadata { get; set; }
    }
}
