﻿using IssueTracker.Common.Models;

namespace IssueTracker.Common.Data.Repositories
{
	public interface IStatusRepository : IBaseProjectRepository<Status>
	{
		Status Name(string status);
	}
}