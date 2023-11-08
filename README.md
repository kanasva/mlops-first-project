# mlops-first-project

This is my first MLOps Project, forked from [mlplatform-workshop](https://github.com/aporia-ai/mlplatform-workshop) by Alon Gubkin. You can find his useful workshop in:

- [Building an ML Platform from Scratch: Live Coding Session // Alon Gubkin // MLOps Meetup #67](https://www.youtube.com/watch?v=s8Jj9gzQ3xA)
- [Building an ML Platform from Scratch: Live Coding Session - Part 2 //Alon Gubkin // MLOps Meetup #74](https://www.youtube.com/watch?v=C2y72n2oyqs)
- [How To Build an ML Platform from Scratch](https://www.aporia.com/blog/building-an-ml-platform-from-scratch/)

Things I adjusted from the original repo are:

- Update dependencies to be able to deploy in current AWS
- Modified some code in mlops_infra as [shabieh2 wrote](https://github.com/aporia-ai/mlplatform-workshop/issues/5#issuecomment-1459073895) to be able to deploy in current AWS
- Omitted DVC as I did not have time to implement
- Changed the model to be scikit-learn KNeighborsClassifier because the old one could not run on my mac
- Something more that I forgot

Subfolders:

- `mlops_infra` is to initialise infrastructure in AWS
- `model-template` is a template for creating new projects to deploy in the infrastructure
- `iris-mlops` is a project created from `model-template`
