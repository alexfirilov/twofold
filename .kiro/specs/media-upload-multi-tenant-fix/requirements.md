# Requirements Document

## Introduction

The application is currently undergoing a migration to a multi-user environment with "corners" (personal spaces). While corner creation and user invitations are working correctly, the media upload feature has a critical issue: files are successfully uploaded to S3 but are not being displayed in the application because they're not properly associated with the current corner. Additionally, the multi-user environment needs improvements to ensure proper data isolation and user experience.

## Requirements

### Requirement 1: Fix Media Upload Corner Association

**User Story:** As a user uploading media to my corner, I want my uploaded files to appear in the media gallery immediately after upload, so that I can see and manage my memories.

#### Acceptance Criteria

1. WHEN a user uploads media files THEN the system SHALL associate each media record with the current corner ID
2. WHEN media is uploaded successfully THEN the system SHALL display the uploaded media in the corner's gallery immediately
3. WHEN a user switches between corners THEN the system SHALL only show media belonging to the selected corner
4. IF no corner is selected THEN the system SHALL prevent media upload and prompt the user to select a corner

### Requirement 2: Improve Multi-User Data Isolation

**User Story:** As a user with access to multiple corners, I want to ensure that my actions (viewing, uploading, editing) only affect the currently selected corner, so that I don't accidentally modify content in the wrong space.

#### Acceptance Criteria

1. WHEN a user performs any media operation THEN the system SHALL verify the user has access to the target corner
2. WHEN fetching media lists THEN the system SHALL filter results by the current corner ID
3. WHEN creating memory groups THEN the system SHALL associate them with the current corner
4. WHEN a user lacks permission for an operation THEN the system SHALL return a clear error message and prevent the action

### Requirement 3: Enhanced Corner Context Management

**User Story:** As a user managing multiple corners, I want the application to remember my current corner selection and provide clear feedback about which corner I'm working in, so that I can efficiently manage my different spaces.

#### Acceptance Criteria

1. WHEN a user selects a corner THEN the system SHALL persist this selection across browser sessions
2. WHEN a user loads the application THEN the system SHALL restore their last selected corner if available
3. WHEN no corners are available THEN the system SHALL guide the user to create their first corner
4. WHEN corner operations fail THEN the system SHALL provide specific error messages and recovery options

### Requirement 4: Upload Form Corner Integration

**User Story:** As a user uploading media, I want the upload form to clearly show which corner I'm uploading to and prevent uploads if no corner is selected, so that I can be confident my media goes to the right place.

#### Acceptance Criteria

1. WHEN the upload form loads THEN the system SHALL display the current corner name prominently
2. WHEN no corner is selected THEN the system SHALL disable the upload form and show a corner selection prompt
3. WHEN upload fails due to corner access issues THEN the system SHALL show specific error messages about permissions
4. WHEN upload completes successfully THEN the system SHALL refresh the media gallery to show new uploads

### Requirement 5: Media Gallery Corner Filtering

**User Story:** As a user viewing my media gallery, I want to see only the media from my currently selected corner, with clear indicators of which corner I'm viewing, so that I can easily manage my memories.

#### Acceptance Criteria

1. WHEN the media gallery loads THEN the system SHALL fetch and display only media from the current corner
2. WHEN a user switches corners THEN the system SHALL automatically refresh the media gallery with the new corner's content
3. WHEN a corner has no media THEN the system SHALL show an appropriate empty state with upload suggestions
4. WHEN media operations fail THEN the system SHALL show error messages without breaking the gallery interface

### Requirement 6: Memory Group Multi-Tenant Support

**User Story:** As a user creating and managing memory groups, I want them to be properly associated with my current corner and isolated from other corners, so that my organizational structure remains private and separate.

#### Acceptance Criteria

1. WHEN creating a memory group THEN the system SHALL associate it with the current corner ID
2. WHEN listing memory groups THEN the system SHALL filter by the current corner
3. WHEN adding media to memory groups THEN the system SHALL verify both the media and memory group belong to the same corner
4. WHEN a user lacks access to a memory group THEN the system SHALL prevent access and show appropriate error messages