#ifndef DBOP_H
#define DBOP_H

#include <stdio.h>

// Enable debug prints by uncommenting the desired line below
#define DEBUG_INFO_Exercise_6A
#define DEBUG_INFO_Led
#define DEBUG_INFO_MyApp
//#define DEBUG_INFO_PushButton

#ifdef DEBUG_INFO_Exercise_6A
  // All debug prints for Exercise_6A come out in the same format
  #define C_Exercise_6A(msg) printf("                                                      Dbg-Exercise_6A: %s\n", msg)
#else
  // If DEBUG_INFO_Exercise_6A is not defined, C_Exercise_6A becomes an empty macro
  #define C_Exercise_6A(msg)
#endif

#ifdef DEBUG_INFO_Led
  // All debug prints for Led come out in the same format
  #define C_Led(msg) printf("                                                      Dbg-Led: %s\n", msg)
#else
  // If DEBUG_INFO_Led is not defined, C_Led becomes an empty macro
  #define C_Led(msg)
#endif

#ifdef DEBUG_INFO_MyApp
  // All debug prints for MyApp come out in the same format
  #define C_MyApp(msg) printf("                                                      Dbg-MyApp: %s\n", msg)
#else
  // If DEBUG_INFO_MyApp is not defined, C_MyApp becomes an empty macro
  #define C_MyApp(msg)
#endif

#ifdef DEBUG_INFO_PushButton
  // All debug prints for PushButton come out in the same format
  #define C_PushButton(msg) printf("                                                      Dbg-PushButton: %s\n", msg)
#else
  // If DEBUG_INFO_PushButton is not defined, C_PushButton becomes an empty macro
  #define C_PushButton(msg)
#endif

#endif // DBOP_H
