import React, { useState } from 'react';
import { Box, HStack, Button, Image } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import logo from '../assets/logo.png';


const Navbar = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const navigate = useNavigate();

  const openLoginModal = () => setIsLoginOpen(true);
  const closeLoginModal = () => setIsLoginOpen(false);

  const openSignupModal = () => setIsSignupOpen(true);
  const closeSignupModal = () => setIsSignupOpen(false);

  const handleLoginSuccess = () => {
    closeLoginModal();
    navigate('/videos'); // Navigate to videos page after login
  };

  return (
    <Box
      bg="linear-gradient(45deg, #000000, #333788)"
      color="white"
      px={8}
      py={4}
    >
      <HStack justifyContent="space-between">
        <Button variant="link" color="white" onClick={() => navigate('/')}>
          <Image src={logo} alt='VITRANCSCODING' w={{ base: '180px', md: '200px' }} h={{ base: '40px', md: '42px' }} />
        </Button>
        <HStack spacing={4}>
          <Button onClick={openLoginModal} colorScheme="whiteAlpha" variant="outline" boxShadow='lg'>
            Log in
          </Button>
          <Button onClick={openSignupModal} boxShadow='lg' colorScheme="orange">
            Sign up
          </Button>
        </HStack>
      </HStack>

      {/* Modals for Login and Signup */}
      <Login isOpen={isLoginOpen} onClose={closeLoginModal} onSuccess={handleLoginSuccess} />
      <Register isOpen={isSignupOpen} onClose={closeSignupModal} />
    </Box>
  );
};

export default Navbar;
