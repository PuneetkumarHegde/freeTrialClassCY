import { MentorRepository, mentorRepository } from '../repositories/mentor.repository';
import { MentorWithUser } from '../types/mentor.types';
import { AppError } from '../middleware/errorHandler';

export class MentorService {
  constructor(private mentorRepo: MentorRepository = mentorRepository) {}

  async getAllMentors(activeOnly = true): Promise<MentorWithUser[]> {
    return this.mentorRepo.findAll({ isActive: activeOnly ? true : undefined });
  }

  async getMentorById(mentorId: string): Promise<MentorWithUser> {
    const mentor = await this.mentorRepo.findById(mentorId);
    if (!mentor) {
      throw new AppError(`Mentor not found with ID: ${mentorId}`, 404);
    }
    return mentor;
  }
}

export const mentorService = new MentorService();
