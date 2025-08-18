from typing import BinaryIO

from infra.supabase_client import SupabaseClient


class StorageGateway:
    def __init__(self, access_token: str | None = None):
        """Initialize the gateway with the Supabase client."""
        self.supabase = SupabaseClient(access_token)
        self.supabase_client = self.supabase.client

    def upload_file(
        self,
        bucket: str,
        path: str,
        file: BinaryIO,
        content_type: str = "image/jpeg",
    ) -> bool:
        """Upload a file to Supabase Storage.

        Args:
            bucket (str): The name of the bucket to upload to.
            path (str): The path where the file should be stored.
            file (BinaryIO): The file object to upload.

        Returns:
            bool: True if the upload was successful, False otherwise.
        """
        try:
            response = self.supabase_client.storage.from_(bucket).upload(
                path,
                file,
                file_options={"content-type": content_type},
            )
            if response.is_success is False:
                raise Exception(f"Failed to upload file: {response!s}")

            return True
        except Exception as e:
            raise Exception(f"Failed to upload file: {e!s}")

    def download_file(self, bucket: str, path: str) -> bytes:
        """Download a file from Supabase Storage.

        Args:
            bucket (str): The name of the bucket to download from.
            path (str): The path of the file to download.

        Returns:
            bytes: The contents of the downloaded file.
        """
        try:
            response: bytes = self.supabase_client.storage.from_(bucket).download(path)
            return response
        except Exception as e:
            raise Exception(f"Failed to download file: {e!s}")

    def delete_file(self, bucket: str, path: str) -> bool:
        """Delete a file from Supabase Storage.

        Args:
            bucket (str): The name of the bucket containing the file.
            path (str): The path of the file to delete.

        Returns:
            bool: True if the deletion was successful, False otherwise.
        """
        try:
            self.supabase_client.storage.from_(bucket).remove([path])
            return True
        except Exception as e:
            raise Exception(f"Failed to delete file: {e!s}")

    def list_files(self, bucket: str, path: str = "") -> list[dict[str, str]]:
        """List files in a Supabase Storage bucket.

        Args:
            bucket (str): The name of the bucket to list files from.
            path (str, optional): The path to list files from. Defaults to root.

        Returns:
            list[dict[str, str]]: A list of file objects containing metadata.
        """
        try:
            response: list[dict[str, str]] = self.supabase_client.storage.from_(
                bucket,
            ).list(path)
            return response
        except Exception as e:
            raise Exception(f"Failed to list files: {e!s}")

    def get_public_url(self, bucket: str, path: str) -> str:
        """Get the public URL for a file in Supabase Storage.

        Args:
            bucket (str): The name of the bucket containing the file.
            path (str): The path of the file.

        Returns:
            str: The public URL of the file.
        """
        try:
            public_url: str = self.supabase_client.storage.from_(bucket).get_public_url(
                path,
            )
            return public_url
        except Exception as e:
            raise Exception(f"Failed to get public URL: {e!s}")

    def get_signed_url(
        self,
        bucket: str,
        path: str,
        expiry_duration: int,
    ) -> dict[str, str]:
        """Get the signed URL for a file in Supabase Storage.

        Args:
            bucket (str): The name of the bucket containing the file.
            path (str): The path of the file.
            expiry_duration (int): The number of seconds the signed URL should be valid.

        Returns:
            dict[str, str]: The signed URL of the file.
        """
        try:
            signed_url: dict[str, str] = self.supabase_client.storage.from_(
                bucket,
            ).create_signed_url(path, expiry_duration)
            return signed_url
        except Exception as e:
            raise Exception(f"Failed to get signed URL: {e!s}")
