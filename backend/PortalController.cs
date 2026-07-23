using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolVisitPortal.Data;
using SchoolVisitPortal.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace SchoolVisitPortal.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PortalController : ControllerBase
    {
        private readonly PortalDbContext _context;

        public PortalController(PortalDbContext context)
        {
            _context = context;
        }

        // 1. Generic GET endpoint to fetch all rows for a dataset key
        [HttpGet("get-data/{key}")]
        public async Task<IActionResult> GetData(string key)
        {
            try
            {
                if (key.EndsWith("_meta"))
                {
                    var meta = await _context.Metadata.FindAsync(key);
                    return Ok(meta != null ? meta.Value : null);
                }

                switch (key.ToLower())
                {
                    case "schools":
                        return Ok(await _context.Schools.ToListAsync());
                    case "visits":
                        return Ok(await _context.Visits.ToListAsync());
                    case "jhpms_lab":
                        return Ok(await _context.JhpmsLab.ToListAsync());
                    case "edustat":
                        return Ok(await _context.Edustat.ToListAsync());
                    case "edustat_master":
                        return Ok(await _context.EdustatMaster.ToListAsync());
                    case "manpower":
                        return Ok(await _context.Manpower.ToListAsync());
                    case "visit360":
                        return Ok(await _context.Visit360.ToListAsync());
                    default:
                        return BadRequest("Invalid dataset key");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // 2. Generic POST/UPSERT endpoint to save all rows (clears and inserts new ones)
        [HttpPost("set-data/{key}")]
        public async Task<IActionResult> SetData(string key, [FromBody] Newtonsoft.Json.Linq.JToken payload)
        {
            try
            {
                if (key.EndsWith("_meta"))
                {
                    var existingMeta = await _context.Metadata.FindAsync(key);
                    if (existingMeta != null)
                    {
                        existingMeta.Value = payload.ToString();
                        _context.Metadata.Update(existingMeta);
                    }
                    else
                    {
                        await _context.Metadata.AddAsync(new Metadata { Key = key, Value = payload.ToString() });
                    }
                    await _context.SaveChangesAsync();
                    return Ok();
                }

                // Clear current table records and bulk insert
                switch (key.ToLower())
                {
                    case "schools":
                        _context.Schools.RemoveRange(_context.Schools);
                        await _context.SaveChangesAsync();
                        var schools = payload.ToObject<List<School>>();
                        if (schools != null && schools.Count > 0)
                        {
                            await _context.Schools.AddRangeAsync(schools);
                        }
                        break;

                    case "visits":
                        _context.Visits.RemoveRange(_context.Visits);
                        await _context.SaveChangesAsync();
                        var visits = payload.ToObject<List<Visit>>();
                        if (visits != null && visits.Count > 0)
                        {
                            await _context.Visits.AddRangeAsync(visits);
                        }
                        break;

                    case "jhpms_lab":
                        _context.JhpmsLab.RemoveRange(_context.JhpmsLab);
                        await _context.SaveChangesAsync();
                        var labs = payload.ToObject<List<JhpmsLab>>();
                        if (labs != null && labs.Count > 0)
                        {
                            await _context.JhpmsLab.AddRangeAsync(labs);
                        }
                        break;

                    case "edustat":
                        _context.Edustat.RemoveRange(_context.Edustat);
                        await _context.SaveChangesAsync();
                        var edus = payload.ToObject<List<Edustat>>();
                        if (edus != null && edus.Count > 0)
                        {
                            await _context.Edustat.AddRangeAsync(edus);
                        }
                        break;

                    case "edustat_master":
                        _context.EdustatMaster.RemoveRange(_context.EdustatMaster);
                        await _context.SaveChangesAsync();
                        var edumasters = payload.ToObject<List<EdustatMaster>>();
                        if (edumasters != null && edumasters.Count > 0)
                        {
                            await _context.EdustatMaster.AddRangeAsync(edumasters);
                        }
                        break;

                    case "manpower":
                        _context.Manpower.RemoveRange(_context.Manpower);
                        await _context.SaveChangesAsync();
                        var instructors = payload.ToObject<List<Manpower>>();
                        if (instructors != null && instructors.Count > 0)
                        {
                            await _context.Manpower.AddRangeAsync(instructors);
                        }
                        break;

                    case "visit360":
                        _context.Visit360.RemoveRange(_context.Visit360);
                        await _context.SaveChangesAsync();
                        var logs = payload.ToObject<List<Visit360>>();
                        if (logs != null && logs.Count > 0)
                        {
                            await _context.Visit360.AddRangeAsync(logs);
                        }
                        break;

                    default:
                        return BadRequest("Invalid dataset key");
                }

                await _context.SaveChangesAsync();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // 3. User Authentication Controller endpoints
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == req.Username.ToLower());
                if (user == null || user.PasswordHash != req.PasswordHash)
                {
                    return Unauthorized(new { error = "Invalid credentials" });
                }
                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("update-upload-time/{username}")]
        public async Task<IActionResult> UpdateUploadTime(string username, [FromBody] Newtonsoft.Json.Linq.JToken timeObj)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
                if (user == null) return NotFound();

                user.Permissions = timeObj.ToString();
                _context.Users.Update(user);
                await _context.SaveChangesAsync();
                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; }
        public string PasswordHash { get; set; }
    }
}
