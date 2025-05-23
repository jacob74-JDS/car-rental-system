CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `car_id` int(11) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `status` enum('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `bookings` (`id`, `car_id`, `customer_name`, `start_date`, `end_date`, `total_cost`, `status`, `created_at`, `updated_at`, `user_id`) VALUES
(1, 3, 'John Doe', '2025-05-10', '2025-05-12', 150.00, 'confirmed', '2025-05-21 22:12:03', '2025-05-21 22:12:03', NULL),
(2, 1, 'Super Admin', '2025-07-10', '2025-07-12', 100.00, 'pending', '2025-05-22 01:11:24', '2025-05-22 01:11:24', NULL),
(3, 4, 'remedan it', '2025-05-22', '2025-05-26', 600.00, 'confirmed', '2025-05-22 08:32:51', '2025-05-22 08:32:51', 6);



CREATE TABLE `cars` (
  `id` int(11) NOT NULL,
  `make` varchar(255) NOT NULL,
  `model` varchar(255) NOT NULL,
  `year` int(11) NOT NULL,
  `license_plate` varchar(50) NOT NULL,
  `daily_rate` decimal(10,2) NOT NULL,
  `status` enum('available','rented','maintenance') DEFAULT 'available',
  `last_known_latitude` decimal(10,8) DEFAULT NULL,
  `last_known_longitude` decimal(11,8) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `cars` (`id`, `make`, `model`, `year`, `license_plate`, `daily_rate`, `status`, `last_known_latitude`, `last_known_longitude`, `created_at`, `updated_at`, `image_url`) VALUES
(1, 'Toyota', 'Camry', 2022, 'DD-123-XYZ', 50.00, 'available', NULL, NULL, '2025-05-21 22:12:03', '2025-05-21 22:12:03', NULL),
(2, 'Honda', 'Civic', 2021, 'DD-456-ABC', 45.00, 'available', NULL, NULL, '2025-05-21 22:12:03', '2025-05-21 22:12:03', NULL),
(3, 'Ford', 'Explorer', 2023, 'DD-789-LMN', 75.00, 'rented', NULL, NULL, '2025-05-21 22:12:03', '2025-05-21 22:12:03', NULL),
(4, 'Ford', 'Mustang', 2024, 'ADMIN-002', 150.00, 'rented', NULL, NULL, '2025-05-22 01:02:56', '2025-05-22 08:32:51', NULL);




CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('customer','admin') DEFAULT 'customer',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`, `updated_at`) VALUES
(1, 'Dave', 'dawit@gmail.com', '$2b$10$efuX0B5Bs2W57o6J/KpBHeIRxjxwwZ/EiV263ADs/4mU2VRkjhNeG', 'customer', '2025-05-21 23:30:25', '2025-05-21 23:30:25'),
(2, 'Test Customer', 'customer@example.com', '$2b$10$IlqRjaFA6m0tBHgimyNTpu6bOK.Buxo4.Zk2RHM3xNXO9jhJpml3a', 'customer', '2025-05-21 23:43:37', '2025-05-21 23:43:37'),
(3, 'yakob', 'yakob@example.com', '$2b$10$b/4.Hq1sUI9dYvAANdDFseZanVQ2XPEre4NqI1wIVgTksGQYXy45C', 'customer', '2025-05-21 23:54:15', '2025-05-21 23:54:15'),
(4, 'kinde One', 'kinde@example.com', '$2b$10$uzSrO6AWMEJKxGH6Qi4KG.iwQp9G8znA2ex/bEBJivYsF5LX7d8jm', 'customer', '2025-05-22 00:27:07', '2025-05-22 00:27:07'),
(5, 'Super Admin', 'superadmin@example.com', '$2b$10$La0vIghIr/m/6gZj6DXZBevYtz08Yu6KUdK/CiRDbTM7cey49aSCm', 'admin', '2025-05-22 00:45:11', '2025-05-22 00:45:11'),
(6, 'remedan it', 'remedan@example.com', '$2b$10$zhzm01HMotWiAnA5pw5atOO4TPnbVY8BTIi8uDO4Cmf7P7LrVsXJS', 'customer', '2025-05-22 08:10:06', '2025-05-22 08:10:06');


ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `car_id` (`car_id`),
  ADD KEY `fk_booking_user` (`user_id`);


ALTER TABLE `cars`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `license_plate` (`license_plate`);


ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);



ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;


ALTER TABLE `cars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;



ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;



ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`car_id`) REFERENCES `cars` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_booking_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;


