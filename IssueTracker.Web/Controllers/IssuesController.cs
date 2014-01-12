﻿using System.Linq;
using System.Web.Mvc;
using IssueTracker.Common.Data.Repositories;
using IssueTracker.Common.Extensions;
using IssueTracker.Common.Models;

namespace IssueTracker.Web.Controllers
{
    public class IssuesController : Controller
    {
		public IStatusRepository StatusRepository { get; set; }
		public IPriorityRepository PriorityRepository { get; set; }
		public IUserRepository UserRepository { get; set; }
		public IIssueRepository IssueRepository { get; set; }

		public ActionResult Index()
		{
			var priorities = PriorityRepository.All().ToDictionary(x => x.Id);
			var statuses = StatusRepository.All().ToDictionary(x => x.Id);
			var users = UserRepository.All().ToDictionary(x => x.Id);
			var issues = IssueRepository.All(x => x.Number);

			return View(issues.Select(x => new {
				number = x.Number,
				name = x.Name,
				description = x.Description,
				priority = priorities[x.PriorityId].ToString(),
				owner = users[x.OwnerId].ToString(),
				assignee = users[x.AssigneeId].ToString(),
				status = statuses[x.StatusId].ToString(),
				priorityStyle = ToPriorityStyleString(priorities[x.PriorityId]),
				opened = x.Opened.ToApplicationString(),
				closed = x.Closed.ToApplicationString()
			}));
		}

	    private static string ToPriorityStyleString(Base priority)
	    {
		    return priority.Name.Replace(" ", "-").ToLower();
	    }
    }
}
