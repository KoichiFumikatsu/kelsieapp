-- 014: Recordatorios de tareas de trabajo via pg_cron + pg_net
-- Corre cada 15 minutos DENTRO de Supabase
-- Notifica antes de la hora limite segun prioridad:
--   urgent = 60 min antes, high = 30 min antes, mid/low = 15 min antes
-- Tambien re-crea tareas recurrentes al completarlas

-- 1. Funcion de recordatorios de tareas
CREATE OR REPLACE FUNCTION public.send_work_task_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task RECORD;
  hh RECORD;
  payload TEXT;
  due_ts TIMESTAMPTZ;
  lead_minutes INT;
  priority_color INT;
  priority_label TEXT;
BEGIN
  -- Buscar tareas activas con fecha y hora limite
  FOR task IN
    SELECT t.*, p.display_name AS member_name
    FROM work_tasks t
    LEFT JOIN profiles p ON p.id = t.user_id
    WHERE t.status NOT IN ('done', 'cancelled')
      AND t.due_date IS NOT NULL
      AND t.due_time IS NOT NULL
      AND t.due_date >= CURRENT_DATE
  LOOP
    -- Construir timestamp completo de la fecha + hora limite (en zona horaria Bogota)
    due_ts := (task.due_date::text || ' ' || task.due_time::text)::TIMESTAMP AT TIME ZONE 'America/Bogota';

    -- Definir minutos de anticipacion segun prioridad
    CASE task.prioridad
      WHEN 'urgent' THEN lead_minutes := 60; priority_color := 15548452; priority_label := 'URGENTE';
      WHEN 'high'   THEN lead_minutes := 30; priority_color := 16098851; priority_label := 'Alta';
      WHEN 'mid'    THEN lead_minutes := 15; priority_color := 6591981;  priority_label := 'Media';
      ELSE               lead_minutes := 15; priority_color := 9936031;  priority_label := 'Baja';
    END CASE;

    -- Verificar si estamos dentro de la ventana de notificacion
    -- (entre lead_minutes antes y la hora exacta)
    IF NOW() >= (due_ts - (lead_minutes || ' minutes')::INTERVAL)
       AND NOW() < due_ts
       -- Solo notificar una vez: verificar que estamos en el intervalo de 15 min correcto
       AND NOW() >= (due_ts - (lead_minutes || ' minutes')::INTERVAL)
       AND NOW() < (due_ts - (lead_minutes || ' minutes')::INTERVAL + INTERVAL '15 minutes')
    THEN
      -- Obtener webhook del hogar
      SELECT discord_webhook_url INTO hh
      FROM households
      WHERE id = task.household_id;

      IF hh.discord_webhook_url IS NOT NULL AND hh.discord_webhook_url != '' THEN
        payload := jsonb_build_object(
          'embeds', jsonb_build_array(
            jsonb_build_object(
              'title', 'Tarea proxima: ' || task.titulo,
              'description', COALESCE(task.descripcion, ''),
              'color', priority_color,
              'fields', jsonb_build_array(
                jsonb_build_object('name', 'Prioridad', 'value', priority_label, 'inline', true),
                jsonb_build_object('name', 'Hora limite', 'value', to_char(due_ts, 'HH24:MI'), 'inline', true),
                jsonb_build_object('name', 'En', 'value', lead_minutes || ' minutos', 'inline', true)
              ),
              'footer', jsonb_build_object('text', 'Kelsie - Recordatorio de tarea'),
              'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
            )
          )
        )::text;

        PERFORM net.http_post(
          url := hh.discord_webhook_url,
          body := payload::jsonb,
          headers := jsonb_build_object('Content-Type', 'application/json')
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- 2. Funcion para re-crear tareas recurrentes al completar
CREATE OR REPLACE FUNCTION public.handle_recurring_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_date DATE;
BEGIN
  -- Solo actuar cuando el status cambia a 'done'
  IF NEW.status = 'done' AND OLD.status != 'done' AND NEW.is_recurring = true AND NEW.recurrence_pattern IS NOT NULL THEN
    -- Calcular siguiente fecha
    CASE NEW.recurrence_pattern
      WHEN 'daily'   THEN next_date := COALESCE(NEW.due_date, CURRENT_DATE) + INTERVAL '1 day';
      WHEN 'weekly'  THEN next_date := COALESCE(NEW.due_date, CURRENT_DATE) + INTERVAL '1 week';
      WHEN 'monthly' THEN next_date := COALESCE(NEW.due_date, CURRENT_DATE) + INTERVAL '1 month';
      ELSE next_date := NULL;
    END CASE;

    -- Verificar que no pase de la fecha de fin de recurrencia
    IF next_date IS NOT NULL AND (NEW.recurrence_end IS NULL OR next_date <= NEW.recurrence_end) THEN
      INSERT INTO work_tasks (household_id, user_id, titulo, descripcion, prioridad, status, due_date, due_time, is_recurring, recurrence_pattern, recurrence_end, tags, subtasks, notify_on_due)
      VALUES (NEW.household_id, NEW.user_id, NEW.titulo, NEW.descripcion, NEW.prioridad, 'backlog', next_date, NEW.due_time, true, NEW.recurrence_pattern, NEW.recurrence_end, NEW.tags, NEW.subtasks, NEW.notify_on_due);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Trigger para tareas recurrentes
DROP TRIGGER IF EXISTS trg_recurring_task ON work_tasks;
CREATE TRIGGER trg_recurring_task
  AFTER UPDATE OF status ON work_tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_recurring_task();

-- 4. Programar el cron job cada 15 minutos
SELECT cron.schedule(
  'work-task-reminders',
  '*/15 * * * *',
  $$SELECT public.send_work_task_reminders()$$
);
