-- Create function to notify when support ticket is created
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it_user RECORD;
  dept_name TEXT;
BEGIN
  -- Get department name
  SELECT name INTO dept_name FROM departments WHERE id = NEW.requesting_department_id;
  
  -- Notify all IT department users about new ticket
  FOR it_user IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    JOIN departments d ON ur.department_id = d.id 
    WHERE d.code = 'IT'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      it_user.user_id,
      'New Support Ticket: ' || NEW.ticket_number,
      'New ' || NEW.priority || ' priority ticket from ' || COALESCE(dept_name, 'Unknown') || ': ' || NEW.title,
      'ticket',
      '/department/it'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create function to notify when ticket status changes
CREATE OR REPLACE FUNCTION public.notify_ticket_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the requester about status change
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.requested_by,
      'Ticket ' || NEW.ticket_number || ' Updated',
      'Your ticket "' || NEW.title || '" status changed to ' || REPLACE(NEW.status, '_', ' '),
      'ticket',
      '/department/it'
    );
  END IF;
  
  -- Notify if ticket is assigned
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_to,
      'Ticket Assigned: ' || NEW.ticket_number,
      'You have been assigned to ticket: ' || NEW.title,
      'ticket',
      '/department/it'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to notify when activity is assigned/created
CREATE OR REPLACE FUNCTION public.notify_activity_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attendee_id UUID;
  dept_name TEXT;
BEGIN
  -- Get department name
  SELECT name INTO dept_name FROM departments WHERE id = NEW.department_id;
  
  -- Notify attendees if any
  IF NEW.attendees IS NOT NULL AND array_length(NEW.attendees, 1) > 0 THEN
    FOREACH attendee_id IN ARRAY NEW.attendees
    LOOP
      -- Skip if attendee is the creator
      IF attendee_id != NEW.created_by THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          attendee_id,
          'New ' || INITCAP(REPLACE(NEW.activity_type, '_', ' ')) || ': ' || NEW.title,
          'You have been added to a ' || NEW.activity_type || ' in ' || COALESCE(dept_name, 'Unknown'),
          'activity',
          '/department/' || LOWER((SELECT code FROM departments WHERE id = NEW.department_id))
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to notify on low stock
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  warehouse_user RECORD;
  min_qty INTEGER;
BEGIN
  -- Get minimum quantity threshold (default 10)
  min_qty := COALESCE(NEW.min_quantity, 10);
  
  -- Check if stock went from above to below threshold
  IF OLD.quantity >= min_qty AND NEW.quantity < min_qty AND NEW.quantity > 0 THEN
    -- Notify warehouse department users
    FOR warehouse_user IN 
      SELECT ur.user_id 
      FROM user_roles ur 
      JOIN departments d ON ur.department_id = d.id 
      WHERE d.code IN ('WAREHOUSE', 'WH')
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        warehouse_user.user_id,
        'Low Stock Alert: ' || NEW.item_name,
        NEW.item_name || ' is running low (' || NEW.quantity || ' remaining). Consider restocking.',
        'stock',
        '/department/warehouse'
      );
    END LOOP;
  END IF;
  
  -- Check if stock went to zero
  IF OLD.quantity > 0 AND NEW.quantity = 0 THEN
    FOR warehouse_user IN 
      SELECT ur.user_id 
      FROM user_roles ur 
      JOIN departments d ON ur.department_id = d.id 
      WHERE d.code IN ('WAREHOUSE', 'WH')
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        warehouse_user.user_id,
        'Out of Stock: ' || NEW.item_name,
        NEW.item_name || ' is now out of stock! Immediate restocking required.',
        'stock',
        '/department/warehouse'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to notify on upcoming fleet maintenance
CREATE OR REPLACE FUNCTION public.notify_fleet_maintenance_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fleet_user RECORD;
  fleet_info RECORD;
BEGIN
  -- Get fleet info
  SELECT fleet_number, machine_type INTO fleet_info FROM fleets WHERE id = NEW.fleet_id;
  
  -- Notify fleet department users about new maintenance record
  FOR fleet_user IN 
    SELECT ur.user_id 
    FROM user_roles ur 
    JOIN departments d ON ur.department_id = d.id 
    WHERE d.code = 'FLEET'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      fleet_user.user_id,
      'Maintenance Scheduled: ' || COALESCE(fleet_info.fleet_number, 'Fleet'),
      INITCAP(REPLACE(NEW.service_type::text, '_', ' ')) || ' maintenance scheduled for ' || COALESCE(fleet_info.machine_type, 'equipment'),
      'maintenance',
      '/department/fleet'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_ticket_created ON support_tickets;
CREATE TRIGGER trigger_notify_ticket_created
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_created();

DROP TRIGGER IF EXISTS trigger_notify_ticket_updated ON support_tickets;
CREATE TRIGGER trigger_notify_ticket_updated
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_updated();

DROP TRIGGER IF EXISTS trigger_notify_activity_created ON office_activities;
CREATE TRIGGER trigger_notify_activity_created
  AFTER INSERT ON office_activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_activity_created();

DROP TRIGGER IF EXISTS trigger_notify_low_stock ON inventory_items;
CREATE TRIGGER trigger_notify_low_stock
  AFTER UPDATE OF quantity ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();

DROP TRIGGER IF EXISTS trigger_notify_fleet_maintenance ON maintenance_records;
CREATE TRIGGER trigger_notify_fleet_maintenance
  AFTER INSERT ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION notify_fleet_maintenance_due();