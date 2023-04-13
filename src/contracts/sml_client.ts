/* c8 ignore start */
export const SML_TEAL = `
#pragma version 8
intcblock 1 0 2 4
pushbytes TMPL_CREATOR_ADDRESS // TMPL_CREATOR_ADDRESS
store 0
pushbytes TMPL_REGISTRY_ADDRESS // TMPL_REGISTRY_ADDRESS
store 1
global GroupSize
intc_2 // 2
==
bnz main_l39
intc_1 // 0
main_l2:
bnz main_l38
global GroupSize
intc_2 // 2
==
bnz main_l37
intc_1 // 0
main_l5:
bnz main_l36
global GroupSize
intc_0 // 1
==
bnz main_l35
intc_1 // 0
main_l8:
bnz main_l34
global GroupSize
intc_2 // 2
==
bnz main_l33
global GroupSize
pushint 3 // 3
==
bnz main_l32
intc_1 // 0
main_l12:
bnz main_l27
global GroupSize
intc_2 // 2
==
bnz main_l26
intc_1 // 0
main_l15:
bnz main_l25
global GroupSize
pushint 17 // 17
<=
bnz main_l21
intc_1 // 0
main_l18:
bnz main_l20
err
main_l20:
intc_0 // 1
b main_l40
main_l21:
intc_1 // 0
store 2
intc_1 // 0
store 3
intc_1 // 0
store 2
main_l22:
load 2
global GroupSize
<
bnz main_l24
load 3
global GroupSize
==
b main_l18
main_l24:
load 2
gtxns TypeEnum
pushint 6 // appl
==
assert
load 2
gtxns OnCompletion
intc_1 // NoOp
==
assert
load 2
gtxns CloseRemainderTo
global ZeroAddress
==
assert
load 2
gtxns RekeyTo
global ZeroAddress
==
assert
load 2
gtxns Fee
intc_1 // 0
==
load 2
gtxns Fee
global MinTxnFee
pushint 3 // 3
global GroupSize
*
*
<=
||
assert
load 3
intc_0 // 1
+
store 3
load 2
intc_0 // 1
+
store 2
b main_l22
main_l25:
load 0
callsub assertrevenueclaimconditions_7
b main_l40
main_l26:
intc_1 // 0
gtxns TypeEnum
intc_0 // pay
==
intc_0 // 1
gtxns TypeEnum
intc_3 // axfer
==
intc_0 // 1
gtxns TypeEnum
intc_0 // pay
==
||
&&
b main_l15
main_l27:
global GroupSize
intc_2 // 2
==
bnz main_l31
global GroupSize
pushint 3 // 3
==
bnz main_l30
intc_1 // 0
b main_l40
main_l30:
load 1
callsub assertappasaoptinconditions_4
b main_l40
main_l31:
load 1
callsub assertappoptinconditions_3
b main_l40
main_l32:
intc_1 // 0
gtxns TypeEnum
intc_0 // pay
==
intc_0 // 1
gtxns TypeEnum
pushint 6 // appl
==
&&
intc_0 // 1
gtxns OnCompletion
intc_0 // OptIn
==
&&
intc_2 // 2
gtxns TypeEnum
intc_3 // axfer
==
&&
b main_l12
main_l33:
intc_1 // 0
gtxns TypeEnum
intc_0 // pay
==
intc_0 // 1
gtxns TypeEnum
pushint 6 // appl
==
&&
intc_0 // 1
gtxns OnCompletion
intc_0 // OptIn
==
&&
b main_l12
main_l34:
intc_1 // 0
pushint 6 // appl
callsub checkbaselinepreconditions_0
intc_1 // 0
gtxns Fee
global MinTxnFee
global GroupSize
*
<=
// fee not correct
assert
intc_0 // 1
b main_l40
main_l35:
intc_1 // 0
gtxns TypeEnum
pushint 6 // appl
==
intc_1 // 0
gtxns OnCompletion
intc_2 // CloseOut
==
&&
b main_l8
main_l36:
load 1
callsub assertcoinoptinconditions_6
b main_l40
main_l37:
intc_1 // 0
gtxns TypeEnum
intc_0 // pay
==
intc_0 // 1
gtxns TypeEnum
intc_3 // axfer
==
&&
intc_0 // 1
gtxns AssetReceiver
load 0
!=
&&
b main_l5
main_l38:
load 0
load 1
callsub assertregistryrekeyconditions_5
b main_l40
main_l39:
intc_1 // 0
gtxns TypeEnum
intc_0 // pay
==
intc_0 // 1
gtxns TypeEnum
intc_0 // pay
==
&&
intc_0 // 1
gtxns Receiver
load 0
!=
&&
b main_l2
main_l40:
return

// check_baseline_preconditions
checkbaselinepreconditions_0:
proto 2 0
frame_dig -2
global GroupSize
<
// txn_id out of bounds
assert
frame_dig -2
gtxns TypeEnum
frame_dig -1
==
// wrong txn type
assert
frame_dig -2
gtxns CloseRemainderTo
global ZeroAddress
==
// close_remainder_to not zero
assert
frame_dig -2
gtxns TypeEnum
intc_3 // axfer
==
bz checkbaselinepreconditions_0_l2
frame_dig -2
gtxns AssetCloseTo
global ZeroAddress
==
// asset_close_to not zero
assert
checkbaselinepreconditions_0_l2:
retsub

// check_baseline_preconditions_with_fee
checkbaselinepreconditionswithfee_1:
proto 3 0
frame_dig -3
frame_dig -1
callsub checkbaselinepreconditions_0
frame_dig -3
gtxns Fee
frame_dig -2
==
// fee not correct
assert
retsub

// check_baseline_preconditions_with_rekey
checkbaselinepreconditionswithrekey_2:
proto 3 0
frame_dig -3
frame_dig -2
frame_dig -1
callsub checkbaselinepreconditionswithfee_1
frame_dig -3
gtxns RekeyTo
global ZeroAddress
==
// rekey_to incorrect
assert
retsub

// assert_app_optin_conditions
assertappoptinconditions_3:
proto 1 1
intc_1 // 0
global MinTxnFee
global GroupSize
*
intc_0 // pay
callsub checkbaselinepreconditionswithrekey_2
intc_0 // 1
intc_1 // 0
pushint 6 // appl
callsub checkbaselinepreconditionswithrekey_2
intc_1 // 0
gtxns Sender
frame_dig -1
==
// wrong sender
assert
intc_0 // 1
gtxns OnCompletion
intc_0 // OptIn
==
// wrong on_complete
assert
intc_0 // 1
retsub

// assert_app_asa_optin_conditions
assertappasaoptinconditions_4:
proto 1 1
intc_2 // 2
intc_1 // 0
intc_3 // axfer
callsub checkbaselinepreconditionswithrekey_2
intc_2 // 2
gtxns AssetSender
intc_2 // 2
gtxns Receiver
==
// wrong sender
assert
intc_2 // 2
gtxns AssetAmount
intc_1 // 0
==
// wrong amount
assert
frame_dig -1
callsub assertappoptinconditions_3
retsub

// assert_registry_rekey_conditions
assertregistryrekeyconditions_5:
proto 2 1
intc_1 // 0
global MinTxnFee
global GroupSize
*
intc_0 // pay
callsub checkbaselinepreconditionswithrekey_2
intc_0 // 1
intc_1 // 0
intc_0 // pay
callsub checkbaselinepreconditionswithfee_1
intc_1 // 0
gtxns Sender
frame_dig -2
==
// wrong sender
assert
intc_1 // 0
gtxns Amount
pushint 100000 // 100000
>=
// payment too low
assert
intc_0 // 1
gtxns Sender
intc_0 // 1
gtxns Receiver
==
// sender not receiver
assert
intc_0 // 1
gtxns Amount
intc_1 // 0
==
// amount not zero
assert
intc_0 // 1
gtxns RekeyTo
frame_dig -1
==
intc_0 // 1
gtxns RekeyTo
global ZeroAddress
==
||
intc_0 // 1
==
// rekey_to not registry or zero
assert
intc_0 // 1
retsub

// assert_coin_optin_conditions
assertcoinoptinconditions_6:
proto 1 1
intc_1 // 0
global MinTxnFee
intc_2 // 2
*
intc_0 // pay
callsub checkbaselinepreconditionswithrekey_2
intc_0 // 1
global MinTxnFee
intc_2 // 2
*
intc_3 // axfer
callsub checkbaselinepreconditionswithrekey_2
intc_0 // 1
gtxns AssetSender
global ZeroAddress
==
// wrong sender
assert
intc_1 // 0
gtxns Sender
frame_dig -1
==
// wrong sender
assert
intc_1 // 0
gtxns Receiver
intc_0 // 1
gtxns Sender
==
// wrong receiver
assert
intc_1 // 0
gtxns Amount
pushint 210000 // 210000
>=
// payment too low
assert
intc_0 // 1
gtxns Sender
intc_0 // 1
gtxns AssetReceiver
==
// wrong sender
assert
intc_0 // 1
gtxns AssetAmount
intc_1 // 0
==
// wrong amount
assert
intc_0 // 1
retsub

// assert_revenue_claim_conditions
assertrevenueclaimconditions_7:
proto 1 1
intc_1 // 0
global MinTxnFee
global GroupSize
*
intc_0 // pay
callsub checkbaselinepreconditionswithrekey_2
intc_0 // 1
gtxns TypeEnum
intc_3 // axfer
==
bnz assertrevenueclaimconditions_7_l2
intc_0 // 1
intc_1 // 0
intc_0 // pay
callsub checkbaselinepreconditionswithrekey_2
b assertrevenueclaimconditions_7_l3
assertrevenueclaimconditions_7_l2:
intc_0 // 1
intc_1 // 0
intc_3 // axfer
callsub checkbaselinepreconditionswithrekey_2
assertrevenueclaimconditions_7_l3:
intc_1 // 0
gtxns Sender
frame_dig -1
==
// wrong sender
assert
intc_0 // 1
gtxns Receiver
frame_dig -1
==
intc_0 // 1
gtxns AssetReceiver
frame_dig -1
==
||
intc_0 // 1
==
// wrong receiver
assert
intc_0 // 1
retsub
`;
/* c8 ignore stop */
