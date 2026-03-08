-- Grant PermPublish (bit 1 = value 2) to all contributors (role 0) who only have PermSubmit (1).
-- This lets contributors publish their own articles after quality review.
UPDATE profiles SET permissions = permissions | 2 WHERE role = 0 AND (permissions & 2) = 0;
