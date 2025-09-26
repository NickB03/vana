-- Migration: Add chat action button support
-- Version: 001
-- Description: Add tables for message feedback, edit history, and regeneration tasks

-- Create message feedback table
CREATE TABLE IF NOT EXISTS message_feedback (
    id VARCHAR(255) PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('upvote', 'downvote')),
    reason TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    client_ip VARCHAR(45),
    user_agent TEXT,

    -- Indexes
    INDEX idx_message_feedback_message_id (message_id),
    INDEX idx_message_feedback_session_id (session_id),
    INDEX idx_message_feedback_user_id (user_id),
    INDEX idx_message_feedback_created_at (created_at),

    -- Prevent duplicate feedback from same user for same message
    UNIQUE KEY unique_user_message_feedback (user_id, message_id)
);

-- Create message edit history table
CREATE TABLE IF NOT EXISTS message_edit_history (
    id VARCHAR(255) PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    original_content LONGTEXT NOT NULL,
    edited_content LONGTEXT NOT NULL,
    edit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    edit_reason VARCHAR(500),
    metadata JSON,

    -- Indexes
    INDEX idx_message_history_message_id (message_id),
    INDEX idx_message_history_session_id (session_id),
    INDEX idx_message_history_user_id (user_id),
    INDEX idx_message_history_edit_timestamp (edit_timestamp)
);

-- Create regeneration tasks table
CREATE TABLE IF NOT EXISTS regeneration_tasks (
    id VARCHAR(255) PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    original_message_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    progress DECIMAL(5,2) DEFAULT 0.00,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    context JSON,
    user_id INTEGER,

    -- Indexes
    INDEX idx_regeneration_tasks_message_id (message_id),
    INDEX idx_regeneration_tasks_session_id (session_id),
    INDEX idx_regeneration_tasks_status (status),
    INDEX idx_regeneration_tasks_created_at (created_at),
    INDEX idx_regeneration_tasks_user_id (user_id)
);

-- Create chat action logs table for audit trail
CREATE TABLE IF NOT EXISTS chat_action_logs (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255),
    action_type VARCHAR(50) NOT NULL,
    user_id INTEGER,
    details JSON,
    client_ip VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_chat_action_logs_session_id (session_id),
    INDEX idx_chat_action_logs_message_id (message_id),
    INDEX idx_chat_action_logs_action_type (action_type),
    INDEX idx_chat_action_logs_user_id (user_id),
    INDEX idx_chat_action_logs_created_at (created_at)
);

-- Create message analytics table for usage statistics
CREATE TABLE IF NOT EXISTS message_analytics (
    id VARCHAR(255) PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL UNIQUE,
    session_id VARCHAR(255) NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
    character_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    regeneration_count INTEGER DEFAULT 0,
    edit_count INTEGER DEFAULT 0,
    upvote_count INTEGER DEFAULT 0,
    downvote_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_message_analytics_message_id (message_id),
    INDEX idx_message_analytics_session_id (session_id),
    INDEX idx_message_analytics_message_type (message_type),
    INDEX idx_message_analytics_created_at (created_at)
);

-- Create stored procedures for common operations

DELIMITER //

-- Procedure to record feedback
CREATE PROCEDURE RecordMessageFeedback(
    IN p_feedback_id VARCHAR(255),
    IN p_message_id VARCHAR(255),
    IN p_session_id VARCHAR(255),
    IN p_user_id INTEGER,
    IN p_feedback_type VARCHAR(20),
    IN p_reason TEXT,
    IN p_metadata JSON,
    IN p_client_ip VARCHAR(45),
    IN p_user_agent TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Insert feedback record
    INSERT INTO message_feedback (
        id, message_id, session_id, user_id, feedback_type,
        reason, metadata, client_ip, user_agent
    ) VALUES (
        p_feedback_id, p_message_id, p_session_id, p_user_id, p_feedback_type,
        p_reason, p_metadata, p_client_ip, p_user_agent
    ) ON DUPLICATE KEY UPDATE
        feedback_type = VALUES(feedback_type),
        reason = VALUES(reason),
        metadata = VALUES(metadata),
        created_at = CURRENT_TIMESTAMP;

    -- Update analytics
    INSERT INTO message_analytics (
        id, message_id, session_id, message_type,
        upvote_count, downvote_count, updated_at
    )
    SELECT
        CONCAT('analytics_', p_message_id),
        p_message_id,
        p_session_id,
        'assistant',
        CASE WHEN p_feedback_type = 'upvote' THEN 1 ELSE 0 END,
        CASE WHEN p_feedback_type = 'downvote' THEN 1 ELSE 0 END,
        CURRENT_TIMESTAMP
    ON DUPLICATE KEY UPDATE
        upvote_count = upvote_count + CASE WHEN p_feedback_type = 'upvote' THEN 1 ELSE 0 END,
        downvote_count = downvote_count + CASE WHEN p_feedback_type = 'downvote' THEN 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP;

    -- Log the action
    INSERT INTO chat_action_logs (
        id, session_id, message_id, action_type, user_id,
        details, client_ip, user_agent
    ) VALUES (
        CONCAT('log_', UUID()),
        p_session_id,
        p_message_id,
        'feedback_submitted',
        p_user_id,
        JSON_OBJECT(
            'feedback_type', p_feedback_type,
            'has_reason', p_reason IS NOT NULL
        ),
        p_client_ip,
        p_user_agent
    );

    COMMIT;
END //

-- Procedure to record message edit
CREATE PROCEDURE RecordMessageEdit(
    IN p_edit_id VARCHAR(255),
    IN p_message_id VARCHAR(255),
    IN p_session_id VARCHAR(255),
    IN p_original_content LONGTEXT,
    IN p_edited_content LONGTEXT,
    IN p_user_id INTEGER,
    IN p_edit_reason VARCHAR(500),
    IN p_metadata JSON
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Insert edit history
    INSERT INTO message_edit_history (
        id, message_id, session_id, original_content, edited_content,
        user_id, edit_reason, metadata
    ) VALUES (
        p_edit_id, p_message_id, p_session_id, p_original_content, p_edited_content,
        p_user_id, p_edit_reason, p_metadata
    );

    -- Update analytics
    INSERT INTO message_analytics (
        id, message_id, session_id, message_type,
        edit_count, updated_at
    )
    SELECT
        CONCAT('analytics_', p_message_id),
        p_message_id,
        p_session_id,
        'user',
        1,
        CURRENT_TIMESTAMP
    ON DUPLICATE KEY UPDATE
        edit_count = edit_count + 1,
        updated_at = CURRENT_TIMESTAMP;

    -- Log the action
    INSERT INTO chat_action_logs (
        id, session_id, message_id, action_type, user_id,
        details
    ) VALUES (
        CONCAT('log_', UUID()),
        p_session_id,
        p_message_id,
        'message_edited',
        p_user_id,
        JSON_OBJECT(
            'original_length', CHAR_LENGTH(p_original_content),
            'edited_length', CHAR_LENGTH(p_edited_content),
            'has_reason', p_edit_reason IS NOT NULL
        )
    );

    COMMIT;
END //

-- Procedure to create regeneration task
CREATE PROCEDURE CreateRegenerationTask(
    IN p_task_id VARCHAR(255),
    IN p_message_id VARCHAR(255),
    IN p_session_id VARCHAR(255),
    IN p_original_message_id VARCHAR(255),
    IN p_user_id INTEGER,
    IN p_context JSON
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Insert regeneration task
    INSERT INTO regeneration_tasks (
        id, message_id, session_id, original_message_id,
        user_id, context
    ) VALUES (
        p_task_id, p_message_id, p_session_id, p_original_message_id,
        p_user_id, p_context
    );

    -- Update analytics
    INSERT INTO message_analytics (
        id, message_id, session_id, message_type,
        regeneration_count, updated_at
    )
    SELECT
        CONCAT('analytics_', p_message_id),
        p_message_id,
        p_session_id,
        'assistant',
        1,
        CURRENT_TIMESTAMP
    ON DUPLICATE KEY UPDATE
        regeneration_count = regeneration_count + 1,
        updated_at = CURRENT_TIMESTAMP;

    -- Log the action
    INSERT INTO chat_action_logs (
        id, session_id, message_id, action_type, user_id,
        details
    ) VALUES (
        CONCAT('log_', UUID()),
        p_session_id,
        p_message_id,
        'regeneration_started',
        p_user_id,
        JSON_OBJECT(
            'task_id', p_task_id,
            'original_message_id', p_original_message_id,
            'has_context', p_context IS NOT NULL
        )
    );

    COMMIT;
END //

DELIMITER ;

-- Create views for common queries

-- View for message feedback statistics
CREATE VIEW message_feedback_stats AS
SELECT
    mf.message_id,
    mf.session_id,
    COUNT(*) as total_feedback,
    SUM(CASE WHEN mf.feedback_type = 'upvote' THEN 1 ELSE 0 END) as upvotes,
    SUM(CASE WHEN mf.feedback_type = 'downvote' THEN 1 ELSE 0 END) as downvotes,
    (SUM(CASE WHEN mf.feedback_type = 'upvote' THEN 1 ELSE 0 END) / COUNT(*)) as upvote_ratio,
    MIN(mf.created_at) as first_feedback,
    MAX(mf.created_at) as latest_feedback
FROM message_feedback mf
GROUP BY mf.message_id, mf.session_id;

-- View for regeneration task summary
CREATE VIEW regeneration_task_summary AS
SELECT
    rt.session_id,
    rt.message_id,
    rt.status,
    rt.progress,
    rt.created_at,
    rt.started_at,
    rt.completed_at,
    CASE
        WHEN rt.completed_at IS NOT NULL AND rt.started_at IS NOT NULL
        THEN TIMESTAMPDIFF(SECOND, rt.started_at, rt.completed_at)
        ELSE NULL
    END as duration_seconds
FROM regeneration_tasks rt;

-- View for session activity summary
CREATE VIEW session_activity_summary AS
SELECT
    cal.session_id,
    COUNT(*) as total_actions,
    COUNT(DISTINCT cal.message_id) as unique_messages,
    COUNT(DISTINCT cal.user_id) as unique_users,
    MIN(cal.created_at) as first_activity,
    MAX(cal.created_at) as latest_activity,
    SUM(CASE WHEN cal.action_type = 'message_edited' THEN 1 ELSE 0 END) as edit_count,
    SUM(CASE WHEN cal.action_type = 'feedback_submitted' THEN 1 ELSE 0 END) as feedback_count,
    SUM(CASE WHEN cal.action_type = 'regeneration_started' THEN 1 ELSE 0 END) as regeneration_count
FROM chat_action_logs cal
GROUP BY cal.session_id;

-- Create indexes on views for better performance
CREATE INDEX idx_message_feedback_stats_session ON message_feedback_stats (session_id);
CREATE INDEX idx_regeneration_task_summary_session ON regeneration_task_summary (session_id);
CREATE INDEX idx_session_activity_summary_latest ON session_activity_summary (latest_activity);