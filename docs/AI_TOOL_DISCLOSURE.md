# AI Tool Disclosure

## 1. Purpose

This document discloses the use of artificial intelligence (AI) tools
during the development of the WayLink application for the Tech-Triathlon
Hackathon.

AI tools were used as development assistants for selected activities
such as planning, code review, debugging, documentation, and
implementation support. The team remained responsible for the final
technical decisions, integration, testing, verification, and submitted
work.

------------------------------------------------------------------------

## 2. AI Tools Used

The following AI-assisted tools were used during development:

-   **ChatGPT** --- used as a development and reasoning assistant for
    requirements analysis, architecture discussions, implementation
    planning, debugging, code review, documentation, and
    troubleshooting.
-   **Claude Code** --- used as an AI coding assistant for selected
    development tasks, including repository-level code assistance, code
    analysis, implementation support, and development workflow tasks.

The exact extent of AI assistance varied between team members and
development tasks.

------------------------------------------------------------------------

## 3. Areas That Were AI-Assisted

AI assistance was used in the following areas where applicable:

### 3.1 Requirements and Challenge Analysis

AI was used to:

-   Analyse the challenge booklet and design requirements.
-   Break large requirements into smaller implementation tasks.
-   Identify workflow dependencies between the Store Manager,
    Dispatcher, Loader, Driver, and other application roles.
-   Clarify ambiguities in requirements and identify potential edge
    cases.
-   Compare implementation decisions against the intended workflow and
    design specification.

The team made the final interpretation of the requirements and decided
which recommendations were appropriate for the project.

### 3.2 Architecture and Development Planning

AI assistance was used to:

-   Discuss backend and frontend architecture.
-   Plan the modular structure of the backend.
-   Break development into phases and tasks.
-   Suggest implementation sequences and integration strategies.
-   Review potential risks such as merge conflicts, API dependencies,
    database state, and cross-role workflow dependencies.

The final architecture and implementation approach were selected and
approved by the team.

### 3.3 Coding and Implementation Support

AI coding assistance was used selectively for:

-   Generating or suggesting implementation approaches.
-   Modifying existing code according to requirements.
-   Creating supporting code structures and boilerplate where
    appropriate.
-   Refactoring code while preserving existing behaviour.
-   Suggesting fixes for identified bugs.
-   Assisting with frontend components, backend structure, API-related
    code, and validation logic.

AI-generated or AI-suggested code was reviewed by team members before
being incorporated into the project. Code was also tested and adjusted
to fit the project's existing architecture and requirements.

### 3.4 Debugging and Troubleshooting

AI tools were used to help diagnose issues involving:

-   Docker and Docker Compose.
-   Environment variables and configuration.
-   MongoDB/MongoDB Atlas connectivity and database state.
-   Build and dependency installation errors.
-   TypeScript compilation and application errors.
-   Frontend workflow and state-management issues.
-   Git branches, merges, and integration problems.

AI suggestions were treated as hypotheses or possible solutions rather
than authoritative answers. The team verified issues using actual
project output, logs, commands, tests, and application behaviour.

### 3.5 Code Review and Quality Checks

AI assistance was used to review code for:

-   Logical errors.
-   Inconsistent state transitions.
-   Potential edge cases.
-   Structural issues.
-   Requirement mismatches.
-   Possible regressions introduced during implementation.

The final decision to accept, modify, or reject suggestions was made by
the team.

### 3.6 Documentation

AI was used to assist with:

-   Structuring technical documentation.
-   Improving clarity and consistency of documentation.
-   Drafting explanations of implementation decisions.
-   Organising development notes and technical information.

Team members reviewed and edited documentation to ensure that it
accurately represented the actual implementation.

------------------------------------------------------------------------

## 4. Work That Was Not Delegated to AI

AI tools did not independently determine or own the final project
outcome.

The following remained human/team responsibilities:

-   Interpreting the competition requirements and deciding how they
    should be implemented.
-   Making final architecture and technology decisions.
-   Designing the actual application workflow and user experience.
-   Deciding which features were required for the submission.
-   Creating and reviewing the team's implementation.
-   Integrating work from different team members and branches.
-   Resolving merge conflicts and integration issues.
-   Configuring and operating the development environment.
-   Running the application and verifying actual behaviour.
-   Testing the application against the required workflows.
-   Validating database state and API behaviour.
-   Reviewing AI-generated suggestions before use.
-   Identifying whether suggested solutions were compatible with the
    existing codebase.
-   Making the final submission decisions.

AI tools were therefore used as assistants rather than as autonomous
decision-makers.

------------------------------------------------------------------------

## 5. How AI Assistance Was Used

The team's general AI-assisted workflow was:

1.  **Understand the requirement**\
    The requirement or development problem was first identified from the
    challenge specification, existing code, application behaviour, or
    development task.

2.  **Provide relevant project context**\
    When using an AI tool, relevant requirements, code, error messages,
    file structures, logs, or implementation constraints were provided
    as context.

3.  **Request analysis or implementation assistance**\
    The AI tool was asked to analyse the problem, propose an approach,
    review code, identify likely causes, or assist with an
    implementation.

4.  **Review the suggestion**\
    Team members evaluated the response against the actual project
    architecture and requirements.

5.  **Implement and adapt**\
    Useful suggestions were incorporated manually or through an AI
    coding assistant and adapted to the project where necessary.

6.  **Verify the result**\
    The resulting code or configuration was tested using the actual
    project environment, build process, application workflow, tests,
    logs, or other appropriate verification methods.

7.  **Retain human responsibility**\
    The team made the final decision about whether the result was
    correct and suitable for submission.

------------------------------------------------------------------------

## 6. Important Limitations of AI Assistance

AI-generated suggestions were not assumed to be correct.

The team accounted for the possibility of:

-   Incorrect assumptions about the project.
-   Outdated or incompatible library/API information.
-   Suggestions that did not match the existing architecture.
-   Incorrect debugging hypotheses.
-   Code that required modification before integration.
-   Suggestions that could introduce regressions.

For this reason, AI output was reviewed and validated against the actual
repository and running application before being relied upon.

------------------------------------------------------------------------

## 7. Human Ownership and Accountability

The submitted application is the responsibility of the project team.

Although AI tools assisted with parts of the development process, the
team:

-   Directed the development process.
-   Selected the final solutions.
-   Integrated the different components.
-   Tested the implementation.
-   Verified that the application worked as intended.
-   Made the final technical and design decisions.
-   Remains accountable for the correctness and behaviour of the
    submitted system.

This disclosure is intended to provide transparency about the role of AI
in the development process and does not represent AI-generated output as
independent team work.

------------------------------------------------------------------------

## 8. Summary

AI was used as a productivity, reasoning, coding, debugging, and
documentation assistant throughout selected parts of the project.

The use of AI primarily supported the development process rather than
replacing the team's responsibility for engineering decisions. All
AI-assisted contributions that were incorporated into the project were
subject to human review, adaptation, integration, and verification.

The final application represents the combined work of the project team,
with AI used as an assisting development tool where appropriate.
