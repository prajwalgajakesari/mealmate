import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { validateTwilioSignature, sendMessage } from '../services/twilio-client';
import { handleIncomingMessage } from '../handlers/incoming';
import { config } from '../config';

const TwilioWebhookBody = z.object({
  MessageSid: z.string(),
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  NumMedia: z.string().optional(),
});

type TwilioWebhookPayload = z.infer<typeof TwilioWebhookBody>;

const webhookRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post(
    '/api/v1/whatsapp/webhook',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Validate Twilio signature in production
      if (config.nodeEnv === 'production') {
        const signature = request.headers['x-twilio-signature'] as string | undefined;

        if (!signature) {
          fastify.log.warn('Missing Twilio signature header');
          return reply.status(403).send({ error: 'Missing Twilio signature' });
        }

        const protocol = request.headers['x-forwarded-proto'] || 'https';
        const host = request.headers['host'] || '';
        const url = `${protocol}://${host}${request.url}`;

        const params = request.body as Record<string, string>;
        const isValid = validateTwilioSignature(url, params, signature);

        if (!isValid) {
          fastify.log.warn('Invalid Twilio signature');
          return reply.status(403).send({ error: 'Invalid Twilio signature' });
        }
      }

      // Parse and validate body
      const parseResult = TwilioWebhookBody.safeParse(request.body);

      if (!parseResult.success) {
        fastify.log.warn({ errors: parseResult.error.issues }, 'Invalid webhook payload');
        return reply.status(400).send({ error: 'Invalid payload' });
      }

      const payload: TwilioWebhookPayload = parseResult.data;

      fastify.log.info(
        {
          messageSid: payload.MessageSid,
          from: payload.From,
          body: payload.Body.substring(0, 50),
        },
        'Incoming WhatsApp message'
      );

      // Process the message
      try {
        const responseText = await handleIncomingMessage(fastify, {
          from: payload.From,
          body: payload.Body,
          messageSid: payload.MessageSid,
        });

        // Send reply via Twilio
        const result = await sendMessage(payload.From, responseText);

        if (!result.success) {
          fastify.log.error(
            { error: result.error, to: payload.From },
            'Failed to send WhatsApp reply'
          );
        }
      } catch (err) {
        fastify.log.error({ err, messageSid: payload.MessageSid }, 'Error processing incoming message');
      }

      // Twilio expects a 200 with empty TwiML or just 200 OK
      // Returning empty TwiML to prevent Twilio from sending a default reply
      reply.header('Content-Type', 'text/xml');
      return reply.status(200).send('<Response></Response>');
    }
  );
};

export default webhookRoutes;
