"""User Profile Gateway for managing user profiles."""

from sqlmodel import Session, select

from src.domain.entity.models import GeneralUserProfiles


class UserProfileGateway:
    """Gateway for user profile operations."""

    def get_by_user_id(
        self, user_id: str, session: Session
    ) -> GeneralUserProfiles | None:
        """Get user profile by user ID.

        Args:
            user_id: User ID
            session: Database session

        Returns:
            User profile if found, None otherwise
        """
        statement = select(GeneralUserProfiles).where(
            GeneralUserProfiles.user_id == user_id
        )
        return session.exec(statement).first()

    def create(
        self, user_id: str, bio: str | None, session: Session
    ) -> GeneralUserProfiles:
        """Create a new user profile.

        Args:
            user_id: User ID
            bio: User bio
            session: Database session

        Returns:
            Created user profile
        """
        profile = GeneralUserProfiles(user_id=user_id, bio=bio)
        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile

    def get_or_create(
        self, user_id: str, session: Session
    ) -> GeneralUserProfiles:
        """Get existing profile or create a new one.

        Args:
            user_id: User ID
            session: Database session

        Returns:
            User profile
        """
        profile = self.get_by_user_id(user_id, session)
        if profile is None:
            profile = self.create(user_id, None, session)
        return profile
