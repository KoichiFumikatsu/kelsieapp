-- 012: Recordatorios de medicamentos via pg_cron + pg_net
-- Corre cada 15 minutos DENTRO de Supabase, sin depender de Vercel
--
-- Prerequisitos: habilitar las extensiones pg_cron y pg_net
-- en Supabase Dashboard > Database > Extensions

-- 1. Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Funcion que revisa medicamentos pendientes y envia webhooks
CREATE OR REPLACE FUNCTION public.send_medication_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  med RECORD;
  hh RECORD;
  payload TEXT;
  next_dose TIMESTAMPTZ;
  should_deactivate BOOLEAN;
BEGIN
  -- Buscar medicamentos activos con proxima_toma vencida
  FOR med IN
    SELECT m.*, p.display_name AS member_name
    FROM medicamentos m
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.activo = true
      AND m.proxima_toma IS NOT NULL
      AND m.proxima_toma <= NOW()
      AND m.frecuencia_horas IS NOT NULL
  LOOP
    -- Obtener webhook del hogar
    SELECT discord_webhook_url INTO hh
    FROM households
    WHERE id = med.household_id;

    IF hh.discord_webhook_url IS NOT NULL AND hh.discord_webhook_url != '' THEN
      -- Construir el payload del embed de Discord
      payload := jsonb_build_object(
        'embeds', jsonb_build_array(
          jsonb_build_object(
            'title', 'Hora de tomar: ' || med.nombre,
            'description', CASE WHEN med.dosis IS NOT NULL THEN 'Dosis: ' || med.dosis ELSE '' END,
            'color', 15548452,
            'fields', jsonb_build_array(
              jsonb_build_object('name', 'Para', 'value', COALESCE(med.member_name, 'Miembro'), 'inline', true),
              jsonb_build_object('name', 'Frecuencia', 'value', 'Cada ' || med.frecuencia_horas || 'h', 'inline', true)
            ),
            'footer', jsonb_build_object('text', 'Kelsie - Recordatorio de medicamento'),
            'timestamp', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
        )
      )::text;

      -- Enviar webhook via pg_net
      PERFORM net.http_post(
        url := hh.discord_webhook_url,
        body := payload::jsonb,
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    END IF;

    -- Calcular la siguiente toma
    next_dose := med.proxima_toma + (med.frecuencia_horas || ' hours')::interval;
    should_deactivate := false;

    -- Verificar si el tratamiento termino
    IF med.fecha_fin IS NOT NULL THEN
      IF next_dose > (med.fecha_fin::date + interval '23 hours 59 minutes 59 seconds') THEN
        should_deactivate := true;
      END IF;
    END IF;

    IF should_deactivate THEN
      UPDATE medicamentos SET activo = false, proxima_toma = NULL WHERE id = med.id;
    ELSE
      -- Avanzar proxima_toma al siguiente horario
      -- Si hay varias tomas atrasadas, avanzar hasta la proxima futura
      WHILE next_dose <= NOW() LOOP
        next_dose := next_dose + (med.frecuencia_horas || ' hours')::interval;
      END LOOP;
      UPDATE medicamentos SET proxima_toma = next_dose WHERE id = med.id;
    END IF;
  END LOOP;
END;
$$;

-- 3. Programar el cron job cada 15 minutos
SELECT cron.schedule(
  'medication-reminders',
  '*/15 * * * *',
  $$SELECT public.send_medication_reminders()$$
);
