-- Add CHECK constraints for booking safety (PT-HIGH-01)
ALTER TABLE "bookings" ADD CONSTRAINT "check_num_people_min" CHECK ("num_people" >= 1);
ALTER TABLE "bookings" ADD CONSTRAINT "check_duration_min" CHECK ("duration" >= 1);
ALTER TABLE "bookings" ADD CONSTRAINT "check_total_price_non_negative" CHECK ("total_price" >= 0);
