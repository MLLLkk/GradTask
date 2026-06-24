INSERT INTO users (name, email, password_hash, role) VALUES
('Dr. Yamen Supervisor', 'supervisor@gradtask.test', '$2y$12$0vreAklLTKIGh8LJDw4X/ee/LC0kAD1KT/AW4yZzKiAlbzhs8gQS2', 'supervisor'),
('Abdulmalik Team Leader', 'leader@gradtask.test', '$2y$12$0vreAklLTKIGh8LJDw4X/ee/LC0kAD1KT/AW4yZzKiAlbzhs8gQS2', 'team_leader'),
('Ahmed Student', 'student1@gradtask.test', '$2y$12$0vreAklLTKIGh8LJDw4X/ee/LC0kAD1KT/AW4yZzKiAlbzhs8gQS2', 'student'),
('Hassan Student', 'student2@gradtask.test', '$2y$12$0vreAklLTKIGh8LJDw4X/ee/LC0kAD1KT/AW4yZzKiAlbzhs8gQS2', 'student');

INSERT INTO projects (title, description, status, supervisor_id, leader_id, start_date, end_date, progress) VALUES
('Physics-Oriented FPS Game in Unity', 'Graduation project for teaching projectile motion through an FPS game built with Unity.', 'in_progress', 1, 2, '2026-02-01', '2026-06-30', 50.00);

INSERT INTO project_members (project_id, user_id, role_in_project) VALUES
(1, 2, 'leader'),
(1, 3, 'member'),
(1, 4, 'member');

INSERT INTO tasks (project_id, title, description, assigned_to, created_by, priority, status, due_date, completed_at) VALUES
(1, 'Build Main Menu UI', 'Create Play, How to Play, About, and Quit screens.', 2, 2, 'high', 'completed', '2026-04-10', '2026-04-08 18:30:00'),
(1, 'Implement projectile shooting', 'Add charge-based shooting mechanic with gravity trajectory.', 3, 2, 'high', 'in_progress', '2026-06-25', NULL),
(1, 'Prepare final report', 'Write final graduation project report and screenshots.', 4, 2, 'medium', 'pending', '2026-06-28', NULL),
(1, 'Add HUD messages', 'Add win/lose messages, timer, and attempts counter.', 3, 2, 'medium', 'completed', '2026-06-01', '2026-06-01 20:00:00');

INSERT INTO comments (task_id, user_id, comment) VALUES
(1, 1, 'Good work. Make sure the About page includes team members and supervisor.'),
(2, 2, 'Please test the trajectory on easy and hard difficulty.'),
(4, 3, 'HUD is connected with timer and attempts counter.');

INSERT INTO activity_logs (user_id, project_id, task_id, action, details) VALUES
(2, 1, 1, 'task_completed', JSON_OBJECT('title', 'Build Main Menu UI')),
(3, 1, 4, 'task_completed', JSON_OBJECT('title', 'Add HUD messages')),
(2, 1, NULL, 'project_created', JSON_OBJECT('title', 'Physics-Oriented FPS Game in Unity'));
