﻿using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using IssueTracker.Common.Data.Repositories;
using IssueTracker.Common.Models;

namespace IssueTracker.Web.Controllers
{
    public class BaseController : Controller
    {
	    private Project _project;

		public IUserRepository UserRepository { get; set; }
		public IProjectRepository ProjectRepository { get; set; }

	    public User SignedInUser
	    {
		    get { return !HttpContext.User.Identity.IsAuthenticated ? null : UserRepository.Email(HttpContext.User.Identity.Name); }
	    }

	    public Project CurrentProject
	    {
		    get { return _project ?? (_project = GetCurrentProject()); }
	    }

	    public int TimezoneOffsetInMinutes
	    {
			get { return GetTimezoneOffset(); }
	    }

	    public void Validate(object obj)
	    {
		    if (obj == null)
			    throw new HttpException(400, "The object failed validation because it's null.");

		    var context = new ValidationContext(obj, null, null);
		    var results = new List<ValidationResult>();
			if (!Validator.TryValidateObject(obj, context, results))
				throw new HttpException(400, "The object failed validation: " + results.Select(x => x.ToString()).Aggregate((first, second) => first + " " + second));
	    }

	    protected override void OnActionExecuted(ActionExecutedContext filterContext)
	    {
		    filterContext.HttpContext.Response.SuppressFormsAuthenticationRedirect = true;
		    base.OnActionExecuted(filterContext);
	    }

	    private Project GetCurrentProject()
	    {
		    var raw = ParseQueryStringParameter("projectId").ToString();
		    return string.IsNullOrEmpty(raw) ? null : ProjectRepository.Details(new Guid(raw));
	    }

		private int GetTimezoneOffset()
		{
			return Convert.ToInt16(ParseQueryStringParameter("timezoneOffset"));
		}

	    private object ParseQueryStringParameter(string parameter)
	    {
			var parameters = ControllerContext.RequestContext.HttpContext.Request.Params;
		    return parameters.AllKeys.All(x => x != parameter) ? null : parameters[parameter];
	    }
    }
}
