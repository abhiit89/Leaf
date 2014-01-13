﻿using IssueTracker.Common.Models;

namespace IssueTracker.Common.Data.Repositories
{
	public interface IPriorityRepository : IRepository<Priority>
	{
		Priority Name(string priority);
	}
}