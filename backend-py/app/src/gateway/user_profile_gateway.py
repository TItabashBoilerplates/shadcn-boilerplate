"""User Profile Gateway for managing user profiles."""

from uuid import UUID

from sqlmodel import Session, select

from domain.entity.models import UserProfiles


class UserProfileGateway:
    """Gateway for user profile operations."""

    def get_by_user_id(self, user_id: UUID, session: Session) -> UserProfiles | None:
        """Get user profile by user ID.

        Args:
            user_id: User ID
            session: Database session

        Returns:
            User profile if found, None otherwise
        """
        statement = select(UserProfiles).where(UserProfiles.user_id == user_id)
        return session.exec(statement).first()

    def get_or_create(self, user_id: UUID, session: Session) -> UserProfiles:
        """Get existing profile or create a new one.

        Args:
            user_id: User ID
            session: Database session

        Returns:
            User profile
        """
        profile = self.get_by_user_id(user_id, session)
        if profile is None:
            # UserProfilesにはbio属性がないため、emailなど必須フィールドを指定
            # 実際の実装では適切なデフォルト値を設定する必要がある
            profile = UserProfiles(
                user_id=user_id,
                email=f"user_{user_id}@temp.example.com",  # 一時的なemail
                first_name="",
                last_name="",
            )
            session.add(profile)
            session.commit()
            session.refresh(profile)
        return profile
