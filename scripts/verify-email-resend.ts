import '../server/src/lib/env';
import { bookingService } from '../server/src/services/booking.service';
import { emailService } from '../server/src/services/email.service';
import { prisma } from '../server/src/lib/prisma';

async function testResendLiveDelivery() {
  console.log('Testing real booking and Resend email delivery with configured environment variables...');
  
  const testEmail = 'youhegde111@gmail.com';
  
  // Create a real trial booking through the booking service
  const booking = await bookingService.createBooking({
    parent: {
      name: 'Gaurav Hegde',
      email: testEmail,
      phone: '+919876543210',
    },
    student: {
      name: 'Aarav Hegde',
      grade: 'Grade 6',
      subject: 'Coding & AI Fundamentals',
      learningGoal: 'Resend Verification Live Test',
    },
    startTime: '2026-10-10T12:00:00.000Z',
    endTime: '2026-10-10T13:00:00.000Z',
    timezone: 'Asia/Kolkata',
  });

  console.log(`Booking created successfully: ${booking.bookingId}`);

  // Fetch the created email logs for this appointment
  const emailLogs = await prisma.emailLog.findMany({
    where: { appointmentId: booking.appointmentId },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Email delivery results for booking:');
  for (const log of emailLogs) {
    console.log(JSON.stringify({
      id: log.id,
      recipientEmail: log.recipientEmail,
      recipientType: log.recipientType,
      subject: log.subject,
      status: log.status,
      providerMessageId: log.providerMessageId,
      errorMessage: log.errorMessage,
      sentAt: log.sentAt
    }, null, 2));
  }

  // Admin logs check
  const adminLogs = await emailService.getEmailLogs(5);
  console.log('Admin Email Logs total found:', adminLogs.length);

  process.exit(0);
}

testResendLiveDelivery().catch((err) => {
  console.error('Error testing live email:', err);
  process.exit(1);
});
