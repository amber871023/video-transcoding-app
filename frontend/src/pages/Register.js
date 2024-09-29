import React, { useState } from 'react';
import {
  Box, Button, Input, FormControl, FormErrorMessage, VStack, Heading, InputGroup, InputLeftElement, InputRightElement, IconButton, useToast,
} from '@chakra-ui/react';
import { FaUser, FaLock, FaEnvelope } from 'react-icons/fa';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const baseUrl = "http://localhost:3001"; // Update with your server's base URL
//const baseUrl = "http://group50.cab432.com:3001";

const Register = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post(`${baseUrl}/users/register`, { email, username, password });
      const { username: registeredUsername } = response.data;

      toast({
        title: 'Registration successful.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setEmail('');
      setUsername('');
      setPassword('');
      navigate('/login');
    } catch (error) {
      setError('Failed to register.');
      toast({
        title: 'Registration failed.',
        description: error.response?.data?.msg || 'Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="84vh"
      bg="gray.50"
      px={4}
    >
      <Box
        w="full" maxW="lg"
        bg="white" px="60px" py={20}
        borderRadius="md"
        boxShadow="lg"
      >
        <Heading textAlign="center" mb={6}>
          Sign Up
        </Heading>
        <VStack spacing={4}>
          <FormControl isInvalid={!!error}>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FaEnvelope color="gray.300" />
              </InputLeftElement>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </InputGroup>
            <InputGroup mt={4}>
              <InputLeftElement pointerEvents="none">
                <FaUser color="gray.300" />
              </InputLeftElement>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </InputGroup>
            <InputGroup mt={4}>
              <InputLeftElement pointerEvents="none">
                <FaLock color="gray.300" />
              </InputLeftElement>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <InputRightElement>
                <IconButton
                  icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  aria-label="Toggle Password Visibility"
                />
              </InputRightElement>
            </InputGroup>
            {error && <FormErrorMessage mt={2}>{error}</FormErrorMessage>}
          </FormControl>
          <Button
            bg="#39349c"
            color="white"
            _hover={{ bg: "#151257" }}
            _active={{ bg: "#151257" }}
            w="full"
            mt={1}
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Sign up
          </Button>
        </VStack>
      </Box>
    </Box>
  );
};

export default Register;
