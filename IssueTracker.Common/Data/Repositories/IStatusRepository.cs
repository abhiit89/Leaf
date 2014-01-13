﻿using IssueTracker.Common.Models;

namespace IssueTracker.Common.Data.Repositories
{
	public interface IStatusRepository : IRepository<Status>
	{
		Status Name(string status);
	}
}