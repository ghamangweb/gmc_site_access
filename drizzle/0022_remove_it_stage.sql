-- IT is no longer a workflow stage: Security activates access directly.
-- Move anything still waiting on IT back to Security so it has an owner.
UPDATE "engagements" SET "workflow_state" = 'AtSecurity' WHERE "workflow_state" = 'AwaitingProvisioning';
