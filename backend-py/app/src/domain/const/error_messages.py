"""Error message constants."""

# Authentication errors
INVALID_AUTH_HEADER = "Invalid authorization header format"
USER_NOT_FOUND = "User not found"
USER_NOT_AUTHENTICATED = "User not authenticated"
UNAUTHORIZED = "Unauthorized"

# Chat room errors
CHAT_ROOM_NOT_FOUND = "ChatRoom not found"

# Message errors
MESSAGE_NOT_FOUND = "Message not found"

# Virtual user errors
VIRTUAL_USER_NOT_FOUND = "VirtualUser not found"

# Configuration errors
OPENAI_API_KEY_NOT_SET = "OPENAI_API_KEY environment variable is not set"
SUPABASE_CONFIG_NOT_SET = "supabase url or anon key is not set"
FAILED_TO_GET_USER = "Failed to get user"
