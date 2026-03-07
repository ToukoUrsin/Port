package models

const (
	PermSubmit          int64 = 1 << 0 // create submissions
	PermPublish         int64 = 1 << 1 // publish articles
	PermModerate        int64 = 1 << 2 // moderate content / replies
	PermManageUsers     int64 = 1 << 3 // edit other profiles, change roles
	PermManageLocations int64 = 1 << 4 // create/edit locations
)

// Role constants
const (
	RoleContributor int16 = 0
	RoleEditor      int16 = 1
	RoleAdmin       int16 = 2
)

// DefaultPermissions returns the default permission bitmask for a role.
func DefaultPermissions(role int16) int64 {
	switch role {
	case RoleContributor:
		return PermSubmit
	case RoleEditor:
		return PermSubmit | PermPublish | PermModerate
	case RoleAdmin:
		return PermSubmit | PermPublish | PermModerate | PermManageUsers | PermManageLocations
	default:
		return 0
	}
}
