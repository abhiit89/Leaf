﻿using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using IssueTracker.Common.Data.Repositories;
using IssueTracker.Common.Models;
using IssueTracker.Common.Models.Base;

namespace IssueTracker.Data.Repositories
{
	public class BaseProjectRepository<TModel> : BaseRepository<TModel>, IBaseProjectRepository<TModel> where TModel : ProjectModel
	{
		public IEnumerable<TModel> Project(Project project, Func<TModel, object> sort = null)
		{
			if (project == null)
				throw new ArgumentNullException("project");

			var results = (IEnumerable<TModel>) Context.Set<TModel>().Where(x => x.Project.Id == project.Id);
			if (sort != null)
				results = results.OrderBy(sort);
			return results;
		}

		public TModel ProjectAndName(Guid projectId, string name)
		{
			if (projectId == Guid.Empty)
				throw new ArgumentNullException("projectId");
			if (string.IsNullOrEmpty(name))
				throw new ArgumentNullException("name");

			return Context.Set<TModel>().FirstOrDefault(x => x.Project.Id == projectId && x.Name.ToLower().Trim() == name.ToLower().Trim());
		}

		public override Guid Insert(TModel model, User user)
		{
			if (model == null)
				throw new ArgumentNullException("model");
			if (model.Id == Guid.Empty)
				model.Id = Guid.NewGuid();

			Context.Entry(model.Project).State = EntityState.Unchanged;
			Context.Set<TModel>().Add(model);
			Context.SaveChanges();
			return model.Id;
		}
	}
}