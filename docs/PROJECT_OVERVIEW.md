# GMC Site Access — Project Overview

This project digitizes **foreign visitor and expatriate** site access for Ghana Manganese Company (GMC).

The system is organized into five sequential layers:

1. Reception
2. Hospital
3. Training School
4. Security
5. Information Technology

Data moves from one layer to the next in strict order, which helps preserve integrity across the pipeline. Each layer has role-based access: some roles are read-only, while others can both read and update records.

Layers depend on upstream work. Nothing downstream can proceed until the previous layer has finished and notified the next layer. For example, Hospital cannot process a visitor until Reception has captured and submitted the information Hospital needs.

## Reception

The **Reception** layer captures and submits visitor information. This includes uploading required documents, entering visitor details, and obtaining approvals from stakeholders (HCM, DMD, GMM).

## Hospital

The **Hospital** layer processes visitor information after being notified by Reception. Its main purpose is to conduct a medical assessment of the visitor.

When the assessment is complete and the visitor is fit to proceed, Hospital notifies the next layer (Training School). If the visitor is not fit to proceed, Hospital notifies Reception to handle the case from there.

## Training School

The **Training School** layer conducts visitor induction. Once induction is complete and the visitor is fit to proceed, Training School notifies the next layer (Security) so the visitor can move forward.

## Security

The **Security** layer audits results from prior layers, then notifies Information Technology to complete biometric enrollment.

## Information Technology

The **Information Technology** layer completes biometric enrollment. After enrollment succeeds, Security and Reception are notified.
