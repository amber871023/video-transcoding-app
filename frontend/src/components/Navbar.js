import React, { useEffect, useState } from 'react';
import {
  Box, HStack, Button, Image, IconButton, Menu, MenuButton, MenuList, MenuItem, MenuDivider, Text,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import the AuthContext
import logo from '../assets/logo.png';

const Navbar = () => {
  const { isLoggedIn, logout, username } = useAuth(); // Assuming `user` contains the username
  const navigate = useNavigate();

  return (
    <Box bg="linear-gradient(45deg, #000000, #333788)" color="white" px={8} py={4} position="sticky" top="0" zIndex="1000">
      <HStack justifyContent="space-between">
        <Link to="/">
          <Image src={logo} alt='VITRANSCODING' w={{ base: '180px', md: '200px' }} h={{ base: '40px', md: '42px' }} />
        </Link>
        <HStack spacing={8} display={{ base: 'none', md: 'flex' }}>
          {isLoggedIn ? (
            <>
              <Text fontWeight="bold">Hi, {username}!</Text>
              <Link to="/">Home</Link>
              <Link to="/videos">History</Link>
              <Link to="/" onClick={logout}>Log out</Link>

            </>
          ) : (
            <>
              <Button onClick={() => navigate('/login')} colorScheme="whiteAlpha" variant="outline" boxShadow='lg'>
                Log in
              </Button>
              <Button onClick={() => navigate('/register')} boxShadow='lg' colorScheme="orange">
                Sign up
              </Button>
            </>
          )}
        </HStack>
        <Menu>
          <MenuButton as={IconButton} icon={<HamburgerIcon />} aria-label='Options' display={{ base: 'flex', md: 'none' }} />
          <MenuList>
            {isLoggedIn ? (
              <>
                <Link to="/"><MenuItem color={'black'}>Home</MenuItem></Link>
                <MenuDivider />
                <Link to="/videos"><MenuItem color={'black'}>History</MenuItem></Link>
                <MenuDivider />
                <Link to="/"><MenuItem color={'black'} onClick={logout}>Log out</MenuItem></Link>
              </>
            ) : (
              <>
                <MenuItem color={'black'} onClick={() => navigate('/login')}>Log in</MenuItem>
                <MenuDivider />
                <MenuItem color={'black'} onClick={() => navigate('/register')}>Sign up</MenuItem>
              </>
            )}
          </MenuList>
        </Menu>
      </HStack>
    </Box>
  );
};

export default Navbar;
