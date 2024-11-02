import React, { useEffect, useState } from 'react';
import { Box, Container, Text, VStack, IconButton, useToast, Button } from '@chakra-ui/react';
import axios from 'axios';
import { FaTrash } from 'react-icons/fa';

const baseUrl = "https://api.group50.cab432.com/api";
// const baseUrl = 'http://localhost:3001';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('idToken');
  const toast = useToast();
  const fetchUsers = async () => {
    if (!token) return; // Only fetch if token is available
    try {
      const response = await axios.get(`${baseUrl}/users/getlist`, {
        withCredentials: true, // Important for CORS
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      // Sort users by username or any other property you wish to maintain order
      const sortedUsers = response.data.sort((a, b) => {
        if (a < b) return -1; // Ascending order
        if (a > b) return 1;  // Ascending order
        return 0; // Equal
      });

      setUsers(sortedUsers); // Set the sorted users data in state
    } catch (err) {
      setError('Failed to load users'); // Handle error
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Call the fetch function
  }, [token]); // Dependency array to re-run effect if token changes

  const handleDeleteUser = async (username) => {
    try {
      await axios.delete(`${baseUrl}/users/delete/${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      // Refresh the user list after deletion
      await fetchUsers(); // Fetch the updated user list
      toast({
        title: 'User deleted.',
        description: 'User has been successfully deleted.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error deleting user.',
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(error);
    }
  };
  const handleToggleUserStatus = async (username) => {
    const isDisabled = localStorage.getItem(username) === 'true'; // Check if the user is currently disabled

    try {
      // Toggle the user status
      const endpoint = isDisabled ? `${baseUrl}/users/enable/${username}` : `${baseUrl}/users/disable/${username}`;
      await axios.post(endpoint, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Update local storage
      localStorage.setItem(username, !isDisabled); // Store the new status
      fetchUsers(); // Fetch the updated user list

      toast({
        title: isDisabled ? 'User enabled.' : 'User disabled.',
        description: `User has been successfully ${isDisabled ? 'enabled' : 'disabled'}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: `Error ${isDisabled ? 'enabling' : 'disabling'} user.`,
        description: 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(error);
    }
  };
  return (
    <Box bg="gray.50" minH="84vh" p={8}>
      <Container maxW="container.md" pt={10} pb={10}>
        <Text fontSize="2xl" fontWeight="bold">User list</Text>
        {error && <Text color="red.500">{error}</Text>} {/* Display error if any */}
        <VStack spacing={4} mt={4} align="stretch">
          {users.length > 0 ? (
            users.map((user) => {
              const isDisabled = localStorage.getItem(user) === 'true'; // Check the user's status from local storage
              return (
                <Box key={user} p={4} borderWidth={1} borderRadius="md" bg="white" position="relative">
                  <Text fontWeight="medium">{user}</Text> {/* Adjust based on your user object */}
                  <Button
                    colorScheme={isDisabled ? "green" : "red"} // Green if disabled, red if enabled
                    position="absolute"
                    top="10px"
                    right="70px"
                    width="80px"
                    onClick={() => handleToggleUserStatus(user)} // Toggle status
                  >
                    {isDisabled ? "Enable" : "Disable"} {/* Button text */}
                  </Button>
                  <IconButton
                    icon={<FaTrash />}
                    color={"red.400"}
                    position="absolute"
                    top="10px" // Adjust as needed
                    right="10px" // Adjust as needed
                    onClick={() => handleDeleteUser(user)} // Use the appropriate user identifier
                    aria-label="Delete user" // For accessibility
                  />
                </Box>
              );
            })
          ) : (
            <Text>No users found</Text> // Message if no users
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default Admin;
