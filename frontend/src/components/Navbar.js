import React, { useState } from 'react';
import { Box, HStack, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';

const Navbar = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const navigate = useNavigate(); // Use useNavigate instead of useHistory

  const openLoginModal = () => setIsLoginOpen(true);
  const closeLoginModal = () => setIsLoginOpen(false);

  const openSignupModal = () => setIsSignupOpen(true);
  const closeSignupModal = () => setIsSignupOpen(false);

  const handleLoginSuccess = () => {
    closeLoginModal();
    navigate('/videos'); // Navigate to /videos page after login
  };

  return (
    <Box bg="purple.600" color="white" px={8} py={4}>
      <HStack justifyContent="space-between">
        <Button variant="link" color="white" onClick={() => navigate('/')}>ViTranscoding</Button>
        <HStack spacing={4}>
          <Button onClick={openLoginModal} colorScheme="whiteAlpha" variant="outline">Log in</Button>
          <Button onClick={openSignupModal} colorScheme="orange">Sign up</Button>
        </HStack>
      </HStack>

      {/* Modals for Login and Signup */}
      <Login isOpen={isLoginOpen} onClose={closeLoginModal} onSuccess={handleLoginSuccess} />
      <Register isOpen={isSignupOpen} onClose={closeSignupModal} />
    </Box>
  );
};

export default Navbar;
