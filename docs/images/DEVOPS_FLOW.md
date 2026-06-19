# DEVOPS PIPELINE
## PATH
plan → code → test → package(release) → deploy → operate → monitor.

## TOOLS

- GitHub for code storage.

- GitHub Actions for CI/CD automation.

- Azure App Service for hosting the web app.

- Azure Key Vault for secrets like database passwords and API keys.

- Terraform for creating Azure resources consistently.

- Application Insights for logs and performance monitoring


### PLAN
- Create environment(Dev, Staging/Test, Production)
- Create the Azure Infrastructure(App Service, Key Vault, Application Insights, databases/storage) using Terraform

### CODE
- Put code in Github  or Azure Repo

### TEST(AUTOMATED)
- This is where automated testing happens.
- Build the CI pipeline
CI runs every time code is pushed: Restore dependencies, Lint/format, Run unit tests, Build the application, Produce deployment artifact.

### RELEASE
- This stage packages the app and prepares it for release
- Build the CD pipeline
CD defines how the app moves through environments: Auto-deploy to dev/staging after CI, Manual approval or gate for production, Use deployment slots for safe swap into production.

### DEPLOY
- Deploy to dev, staging, and production
- Store secrets safely in Azure Key Vault

### OPERATE
- Operation is keeping the environment stable, secure, and consistent over time.
- Secure secret management and identity-based access
- Maintain infrastructure as code

### MONITOR
- Monitor logs errors, response times, failed logins, and workflow issues. This is critical for your app’s approvals, notifications, audit trails, and access control.
- Turn on monitoring with Application Insights and Azure Monitor.


## DEEP DIVE
### Environments
- Dev
- Staging/Test
- Production

Each environment needs Azure resources(App Service Plan, App Service (Web App), Azure Key Vault, Application Insights, Database)

### SETTING IT UP WITH AZURE PORTAL
https://learn.microsoft.com/en-us/azure/deployment-environments/quickstart-create-and-configure-devcenter 


### CONNECTING GITHUB ACTIONS TO AZURE
https://www.youtube.com/watch?v=XkhkkLBkAT4 
https://www.youtube.com/watch?v=r5QdsjjdRDs 