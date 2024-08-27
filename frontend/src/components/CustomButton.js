import React from 'react';
import { Button } from '@chakra-ui/react';
import { Icon } from '@chakra-ui/icons';

const CustomButton = ({ leftIcon, children, ...props }) => {
  return (
    <Button
      leftIcon={leftIcon && <Icon as={leftIcon} />}
      bg="#39349c"
      color="white"
      _hover={{ bg: "#151257" }}
      _active={{ bg: "#151257" }}
      boxShadow="xl"
      {...props}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
