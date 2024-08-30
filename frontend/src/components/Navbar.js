import React, { useState, useEffect } from 'react';
import {
  Box, HStack, Button, Image, VStack, useDisclosure, IconButton, Collapse, Menu, MenuButton, MenuList, MenuItem, MenuDivider
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import logo from '../assets/logo.png';

const Navbar = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isOpen, onToggle } = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const openLoginModal = () => setIsLoginOpen(true);
  const closeLoginModal = () => setIsLoginOpen(false);

  const openSignupModal = () => setIsSignupOpen(true);
  const closeSignupModal = () => setIsSignupOpen(false);

  const handleLoginSuccess = () => {
    closeLoginModal();
    setIsLoggedIn(true);
    navigate(location.pathname); // Navigate back to the current page
  };

  const handleRegisterSuccess = () => {
    closeSignupModal();
    setIsLoggedIn(true);
    navigate(location.pathname);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <Box
      bg="linear-gradient(45deg, #000000, #333788)"
      color="white"
      px={8}
      py={4}
    >
      <HStack justifyContent="space-between">
        <Link to="/">
          <Image src={logo} alt='VITRANSCODING' w={{ base: '180px', md: '200px' }} h={{ base: '40px', md: '42px' }} />
        </Link>

        {/* Desktop Menu */}
        <HStack spacing={8} display={{ base: 'none', md: 'flex' }}>
          {isLoggedIn ? (
            <>
              <Link to="/">Home</Link>
              <Link to="/videos">Videos</Link>
              <Button variant="link" color="white" onClick={handleLogout}>Log out</Button>
            </>
          ) : (
            <>
              <Button onClick={openLoginModal} colorScheme="whiteAlpha" variant="outline" boxShadow='lg'>
                Log in
              </Button>
              <Button onClick={openSignupModal} boxShadow='lg' colorScheme="orange">
                Sign up
              </Button>
            </>
          )}
        </HStack>

        {/* Mobile Toggle Menu */}
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<HamburgerIcon />}
            aria-label='Options'
            display={{ base: 'flex', md: 'none' }}
          />
          <MenuList>
            {isLoggedIn ? (
              <>
                <Link to="/">
                  <MenuItem color={'black'}>Home</MenuItem>
                </Link>
                <MenuDivider />
                <Link to="/videos">
                  <MenuItem color={'black'}>Videos</MenuItem>
                </Link>
                <MenuDivider />
                <MenuItem color={'black'} onClick={handleLogout}>
                  Log out
                </MenuItem>
              </>
            ) : (
              <>
                <MenuItem color={'black'} onClick={openLoginModal}>
                  Log in
                </MenuItem>
                <MenuDivider />
                <MenuItem color={'black'} onClick={openSignupModal}>
                  Sign up
                </MenuItem>
              </>
            )}
          </MenuList>
        </Menu>
      </HStack>

      {/* Mobile Menu */}
      <Collapse in={isOpen} animateOpacity>
        <VStack
          bg="linear-gradient(45deg, #000000, #333788)"
          p={4}
          display={{ md: 'none' }}
          spacing={4}
          align="stretch"
        >
          {isLoggedIn ? (
            <>
              <Link to="/">
                <Button variant="link" color="white">Home</Button>
              </Link>
              <Link to="/videos">
                <Button variant="link" color="white">Videos</Button>
              </Link>
              <Button variant="link" color="white" onClick={handleLogout}>Log out</Button>
            </>
          ) : (
            <>
              <Button onClick={openLoginModal} colorScheme="whiteAlpha" variant="outline" boxShadow='lg' width="100%">
                Log in
              </Button>
              <Button onClick={openSignupModal} boxShadow='lg' colorScheme="orange" width="100%">
                Sign up
              </Button>
            </>
          )}
        </VStack>
      </Collapse>

      {/* Modals for Login and Signup */}
      <Login isOpen={isLoginOpen} onClose={closeLoginModal} onSuccess={handleLoginSuccess} />
      <Register isOpen={isSignupOpen} onClose={closeSignupModal} onSuccess={handleRegisterSuccess} />
    </Box>
  );
};

export default Navbar;
